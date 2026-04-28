import app from "./app";
import { logger } from "./lib/logger";
import { getStorageMode, initializeDataStore } from "./lib/data-store";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main(): Promise<void> {
  try {
    await initializeDataStore();
  } catch (err) {
    logger.error({ err }, "Data store initialization failed");
  }
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port, storageMode: getStorageMode() }, "Server listening");
  });
}

void main();
