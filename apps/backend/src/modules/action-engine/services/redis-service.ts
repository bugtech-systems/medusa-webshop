// src/modules/action-engine/services/redis-service.ts
import { MedusaService } from "@medusajs/framework/utils"
import { Redis } from "ioredis"
import EventEmitter from "events"

export class RedisService extends MedusaService({}) {
  private publisher: Redis
  private subscriber: Redis
  private executionEvents = new EventEmitter()
  private executionQueues = new Map<string, string[]>()
  private readonly EXECUTION_CHANNEL = "action-engine:executions"
  private readonly STATUS_CHANNEL = "action-engine:status"
  private readonly CACHE_PREFIX = "action:cache:"

  async __init() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"
    
    this.publisher = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3
    })

    this.subscriber = new Redis(redisUrl)

    // Subscribe to execution channels
    await this.subscriber.subscribe(
      this.EXECUTION_CHANNEL,
      this.STATUS_CHANNEL
    )

    this.subscriber.on("message", (channel, message) => {
      try {
        const data = JSON.parse(message)
        
        switch (channel) {
          case this.EXECUTION_CHANNEL:
            this.handleExecutionMessage(data)
            break
          case this.STATUS_CHANNEL:
            this.handleStatusUpdate(data)
            break
        }
      } catch (error) {
        console.error("Redis message parse error:", error)
      }
    })

    // Set up periodic cleanup
    setInterval(() => this.cleanupStaleExecutions(), 30000)
  }

  // Queue execution for distributed processing
  async queueExecution(
    executionId: string,
    actionId: string,
    parameters: any,
    priority: number = 1
  ): Promise<void> {
    const queueKey = `execution:queue:${priority}`
    const executionData = {
      executionId,
      actionId,
      parameters,
      timestamp: Date.now(),
      priority,
      workerId: process.env.WORKER_ID || "default"
    }

    await this.publisher.zadd(
      queueKey,
      priority,
      JSON.stringify(executionData)
    )

    // Notify workers
    await this.publishToChannel(this.EXECUTION_CHANNEL, {
      type: "execution_queued",
      ...executionData
    })
  }

  // Claim execution from queue
  async claimExecution(workerId: string): Promise<any | null> {
    const queueKey = "execution:queue:1" // Highest priority queue
    
    const result = await this.publisher.zpopmin(queueKey)
    if (!result || result.length === 0) return null

    const [_, data] = result
    const execution = JSON.parse(data)
    
    // Mark as claimed
    await this.publisher.setex(
      `execution:claimed:${execution.executionId}`,
      300, // 5 minute TTL
      workerId
    )

    return execution
  }

  // Publish execution status updates
  async publishStatusUpdate(
    executionId: string,
    status: string,
    data?: any
  ): Promise<void> {
    const statusData = {
      executionId,
      status,
      data,
      timestamp: Date.now(),
      workerId: process.env.WORKER_ID
    }

    await this.publishToChannel(this.STATUS_CHANNEL, statusData)
    
    // Store in Redis for persistence
    await this.publisher.hset(
      `execution:status:${executionId}`,
      status,
      JSON.stringify(statusData)
    )

    // Update latest status
    await this.publisher.set(
      `execution:latest:${executionId}`,
      JSON.stringify(statusData)
    )
  }

  // Get execution status from Redis
  async getExecutionStatus(executionId: string): Promise<any> {
    const status = await this.publisher.get(`execution:latest:${executionId}`)
    return status ? JSON.parse(status) : null
  }

  // Get execution history
  async getExecutionHistory(executionId: string): Promise<any[]> {
    const history = await this.publisher.hgetall(`execution:status:${executionId}`)
    return Object.values(history).map(item => JSON.parse(item))
  }

  // Action result caching
  async cacheActionResult(
    actionId: string,
    parameters: any,
    result: any,
    ttlSeconds: number = 300
  ): Promise<void> {
    const cacheKey = this.getCacheKey(actionId, parameters)
    await this.publisher.setex(
      cacheKey,
      ttlSeconds,
      JSON.stringify({
        result,
        cachedAt: Date.now(),
        ttl: ttlSeconds
      })
    )
  }

  // Get cached action result
  async getCachedResult(
    actionId: string,
    parameters: any
  ): Promise<any | null> {
    const cacheKey = this.getCacheKey(actionId, parameters)
    const cached = await this.publisher.get(cacheKey)
    
    if (cached) {
      const data = JSON.parse(cached)
      // Check if cache is still valid
      if (Date.now() - data.cachedAt < data.ttl * 1000) {
        return data.result
      }
      // Cache expired, delete it
      await this.publisher.del(cacheKey)
    }
    
    return null
  }

  // Invalidate cache for specific action
  async invalidateCache(actionId: string): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}${actionId}:*`
    const keys = await this.publisher.keys(pattern)
    
    if (keys.length > 0) {
      await this.publisher.del(...keys)
    }
  }

  // Cache frequently used actions with automatic refresh
  async cacheWithRefresh(
    actionId: string,
    parameters: any,
    fetchFunction: () => Promise<any>,
    refreshInterval: number = 60
  ): Promise<any> {
    const cached = await this.getCachedResult(actionId, parameters)
    
    if (cached) {
      // Check if cache needs refresh
      const cacheKey = this.getCacheKey(actionId, parameters)
      const cacheInfo = await this.publisher.get(cacheKey)
      
      if (cacheInfo) {
        const info = JSON.parse(cacheInfo)
        const age = Date.now() - info.cachedAt
        
        // If cache is getting old, refresh in background
        if (age > (refreshInterval * 1000) / 2) {
          this.refreshCacheInBackground(actionId, parameters, fetchFunction)
        }
      }
      
      return cached
    }

    // No cache, fetch and cache
    const result = await fetchFunction()
    await this.cacheActionResult(actionId, parameters, result, refreshInterval)
    return result
  }

  // Distributed locking for critical sections
  async acquireLock(
    lockKey: string,
    ttlSeconds: number = 10,
    retryCount: number = 3
  ): Promise<string | null> {
    const lockValue = `${Date.now()}:${Math.random()}`
    
    for (let i = 0; i < retryCount; i++) {
      const acquired = await this.publisher.set(
        `lock:${lockKey}`,
        lockValue,
        "EX",
        ttlSeconds,
        "NX"
      )
      
      if (acquired === "OK") {
        return lockValue
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)))
    }
    
    return null
  }

  async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    const currentValue = await this.publisher.get(`lock:${lockKey}`)
    
    if (currentValue === lockValue) {
      await this.publisher.del(`lock:${lockKey}`)
    }
  }

  private getCacheKey(actionId: string, parameters: any): string {
    const paramHash = JSON.stringify(parameters)
      .split('')
      .reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0)
        return a & a
      }, 0)
    
    return `${this.CACHE_PREFIX}${actionId}:${paramHash}`
  }

  private async refreshCacheInBackground(
    actionId: string,
    parameters: any,
    fetchFunction: () => Promise<any>
  ): Promise<void> {
    try {
      const result = await fetchFunction()
      await this.cacheActionResult(actionId, parameters, result)
    } catch (error) {
      console.error(`Cache refresh failed for action ${actionId}:`, error)
    }
  }

  private async handleExecutionMessage(data: any): Promise<void> {
    this.executionEvents.emit("execution_message", data)
    
    if (data.type === "execution_queued") {
      // Add to local queue for this worker
      if (!this.executionQueues.has(data.priority)) {
        this.executionQueues.set(data.priority, [])
      }
      this.executionQueues.get(data.priority)!.push(data.executionId)
    }
  }

  private async handleStatusUpdate(data: any): Promise<void> {
    this.executionEvents.emit("status_update", data)
    
    // Forward to any WebSocket connections
    this.executionEvents.emit("ws_broadcast", {
      type: "status_update",
      data
    })
  }

  private async cleanupStaleExecutions(): Promise<void> {
    const pattern = "execution:claimed:*"
    const keys = await this.publisher.keys(pattern)
    
    for (const key of keys) {
      const ttl = await this.publisher.ttl(key)
      if (ttl < 0) {
        await this.publisher.del(key)
      }
    }
  }

  private async publishToChannel(channel: string, data: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(data))
  }

  async __shutdown() {
    await this.publisher.quit()
    await this.subscriber.quit()
  }
}