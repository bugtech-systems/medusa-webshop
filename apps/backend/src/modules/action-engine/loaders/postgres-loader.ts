// src/modules/action-engine/loaders/postgres-loader.ts
import { LoaderOptions } from "@medusajs/framework/types";
import { asValue } from "@medusajs/framework/awilix";
import { Pool } from "pg";

type ModuleOptions = {
  connection_url?: string;
};

export default async function postgresConnectionLoader({
  container,
  options,
  logger,
}: LoaderOptions<ModuleOptions>) {
  if (!options?.connection_url) {
    logger?.warn("PostgreSQL connection URL not provided. Custom DB operations disabled.");
    return;
  }

  logger?.info(`Initializing custom PostgreSQL connection... ${options.connection_url}`);

  const pool = new Pool({
    connectionString: options.connection_url,
    max: 20,
    idleTimeoutMillis: 30000,
  });

  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger?.info("✅ Custom PostgreSQL connection established.");
  } catch (e) {
    logger?.error(`❌ Failed to connect to custom PostgreSQL: ${e}`);
    throw e; // Throwing prevents the module from loading
  }

  // ✅ Register the pool in the module's container
  container.register({
    postgresPool: asValue(pool),
  });

  // Register cleanup logic
  container.register("postgresCleanup", asValue(async () => {
    logger?.info("Closing custom PostgreSQL connections.");
    await pool.end();
  }));
}