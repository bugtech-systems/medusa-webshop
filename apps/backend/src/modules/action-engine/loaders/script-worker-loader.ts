// src/modules/action-engine/loaders/piscina-loader.ts
import { LoaderOptions } from "@medusajs/framework/types";
import { asValue } from "@medusajs/framework/awilix";
import Piscina from "piscina";
import path from "path";

type ModuleOptions = {
  worker?: {
    minThreads?: number;
    maxThreads?: number;
    idleTimeout?: number;
    maxQueue?: number;
    concurrentTasksPerWorker?: number;
    workerPath?: string;
  };
};

export default async function piscinaWorkerLoader({
  container,
  options,
  logger,
}: LoaderOptions<ModuleOptions>) {
  // Configure worker pool options with defaults
  const workerOptions = options?.worker || {};
  
  const workerPath = workerOptions.workerPath 
    ? path.resolve(workerOptions.workerPath)
    : path.join(__dirname,  "services", "script-worker.js");

  logger?.info("Initializing Piscina worker pool...");

  // Calculate optimal max threads if not specified
  const cpuCount = require("os").cpus().length;
  const maxThreads = workerOptions.maxThreads || Math.min(4, cpuCount);

  const pool = new Piscina({
    filename: workerPath,
    minThreads: workerOptions.minThreads || 2,
    maxThreads: maxThreads,
    idleTimeout: workerOptions.idleTimeout || 30000,
    concurrentTasksPerWorker: workerOptions.concurrentTasksPerWorker || 1,
    maxQueue: workerOptions.maxQueue || 100,
  });

  // Verify the worker pool is working
  try {
    // Test the worker with a simple operation
    // You might want to adjust this based on what your worker actually does
    if (typeof pool.run === 'function') {
      // Optional: test with a simple task if your worker supports it
      // await pool.run({ type: 'test' });
    }
    logger?.info(`✅ Piscina worker pool initialized with ${maxThreads} max threads.`);
  } catch (e) {
    logger?.error(`❌ Failed to initialize Piscina worker pool: ${e}`);
    throw e; // Throwing prevents the module from loading
  }

  // ✅ Register the pool in the module's container
  container.register({
    workerPool: asValue(pool),
  });

  // Register cleanup logic to properly close the pool
  container.register("workerPoolCleanup", asValue(async () => {
    logger?.info("Closing Piscina worker pool...");
    await pool.destroy();
  }));

  // Optional: Register pool metrics/stats accessor
  container.register("workerPoolStats", asValue({
    getStats: () => ({
      threads: pool.threads.length,
      queueSize: pool.queueSize,
      completed: pool.completed,
      utilization: pool.utilization,
      options: {
        minThreads: pool.options.minThreads,
        maxThreads: pool.options.maxThreads,
        idleTimeout: pool.options.idleTimeout,
        concurrentTasksPerWorker: pool.options.concurrentTasksPerWorker,
        maxQueue: pool.options.maxQueue,
      }
    })
  }));
}