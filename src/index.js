import { createDbWorker } from "sql.js-httpvfs";

// This is how we bundle the worker and wasm files using Webpack 5
const workerUrl = new URL(
  "sql.js-httpvfs/dist/sqlite.worker.js",
  import.meta.url
);
const wasmUrl = new URL(
  "sql.js-httpvfs/dist/sql-wasm.wasm",
  import.meta.url
);

// Configuration object for our SQLite database
const config = {
  from: "inline",  // We are using an inline config for a simple setup
  config: {
    serverMode: "full",  // Indicating that the file is a full SQLite database
    requestChunkSize: 4096,  // Page size of the SQLite database (default is 4096)
    url: "funding-lite.sqlite"  // URL to the database, relative to the deployment root
  }
};

// Creating the database worker
(async () => {
  const maxBytesToRead = 10 * 1024 * 1024; // Optional limit for bytes read, defaults to Infinity

  // Initialize the database worker with the config
  const worker = await createDbWorker(
    [config],
    workerUrl.toString(),
    wasmUrl.toString(),
    maxBytesToRead
  );

  console.log("Database worker is set up and ready for deployment.");
})();
