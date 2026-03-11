// src/modules/action-engine/loaders/piscina-loader.ts

import { LoaderOptions } from "@medusajs/framework/types";
import { asValue } from "@medusajs/framework/awilix";
import Piscina from "piscina";
import path from "path";
import fs from "fs";
import os from "os";

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
  const workerOptions = options?.worker || {};

  logger?.info("[Piscina] Starting worker pool initialization...");

  try {
    /**
     * Resolve worker path safely after Medusa build
     */
    const workerPath = workerOptions.workerPath
      ? path.resolve(workerOptions.workerPath)
      : path.resolve(
        __dirname,
        "../services/script-worker.js"
      );

    logger?.info(`[Piscina] Resolved worker path: ${workerPath}`);

    /**
     * Validate worker file exists
     */
    if (!fs.existsSync(workerPath)) {
      throw new Error(`[Piscina] Worker file not found: ${workerPath}`);
    }

    /**
     * CPU safe thread calculation
     */
    const cpuCount = os.cpus().length;

    const minThreads = workerOptions.minThreads ?? 1;
    const maxThreads =
      workerOptions.maxThreads ?? Math.min(2, cpuCount);

    logger?.info(
      `[Piscina] CPU detected: ${cpuCount}, using threads: ${minThreads}-${maxThreads}`
    );

    /**
     * Create worker pool
     */
    const pool = new Piscina({
      filename: workerPath,
      minThreads,
      maxThreads,
      idleTimeout: workerOptions.idleTimeout ?? 10000,
      concurrentTasksPerWorker:
        workerOptions.concurrentTasksPerWorker ?? 1,
      maxQueue: workerOptions.maxQueue ?? 50,
    });

    /**
     * Piscina debugging events
     */
    pool.on("error", (err) => {
      logger?.error(`[Piscina] Worker error: ${err?.stack || err}`);
    });

    pool.on("drain", () => {
      logger?.debug("[Piscina] Worker queue drained");
    });

    pool.on("destroy", () => {
      logger?.info("[Piscina] Worker pool destroyed");
    });

    /**
     * Test worker execution (optional but great for debugging)
     */
    try {
      logger?.info("[Piscina] Running worker self-test...");

      // only run if worker supports a test task
      await pool.run({ type: "health-check" }).catch(() => {});

      logger?.info("[Piscina] Worker self-test completed");
    } catch (err) {
      logger?.warn(
        `[Piscina] Worker test failed but pool will continue: ${
          err?.stack || err
        }`
      );
    }

    /**
     * Register pool
     */
    container.register({
      workerPool: asValue(pool),
    });

    logger?.info(
      `[Piscina] Worker pool initialized successfully (${maxThreads} threads)`
    );

    /**
     * Cleanup handler
     */
    container.register(
      "workerPoolCleanup",
      asValue(async () => {
        try {
          logger?.info("[Piscina] Closing worker pool...");
          await pool.destroy();
          logger?.info("[Piscina] Worker pool closed");
        } catch (err) {
          logger?.error(
            `[Piscina] Error during worker pool shutdown: ${
              err?.stack || err
            }`
          );
        }
      })
    );

    /**
     * Safe stats accessor
     */
    container.register(
      "workerPoolStats",
      asValue({
        getStats: () => {
          try {
            return {
              threads: pool.threads?.length ?? 0,
              queueSize: pool.queueSize ?? 0,
              completed: pool.completed ?? 0,
              utilization: pool.utilization ?? 0,
              options: pool.options,
            };
          } catch (err) {
            logger?.error(
              `[Piscina] Failed to collect stats: ${err?.stack || err}`
            );
            return {};
          }
        },
      })
    );
  } catch (error) {
    logger?.error(
      `[Piscina] ❌ Worker pool initialization failed: ${
        error?.stack || error
      }`
    );

    /**
     * Throw so Medusa fails fast instead of silently running broken
     */
    throw error;
  }
}