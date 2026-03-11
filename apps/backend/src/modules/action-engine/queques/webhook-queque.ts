import { Queue, Worker } from "bullmq"
import IORedis from "ioredis"
import fetch from "node-fetch"

const connection = new IORedis({
  host: process.env.REDIS_URL?.split(":")[0] || "192.168.1.150",
  port: 6379,
  maxRetriesPerRequest: null,
}) as any

export const webhookQueue = new Queue("webhook-queue", { connection })

export const webhookWorker = new Worker(
  "webhook-queue",
  async (job) => {
    console.log(job, "JOB DATA")

    const { url, payload } = job.data

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": process.env.WEBHOOK_SECRET || "",
      },
      body: JSON.stringify({ parameters: payload }),
    })

    if (!res.ok) {
      throw new Error(`Webhook failed with status ${res.status}`)
    }
  },
  {
    connection,
    concurrency: 5,
  }
)