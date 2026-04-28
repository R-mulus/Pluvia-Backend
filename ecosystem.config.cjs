module.exports = {
  apps: [
    {
      name: "pluvia-server",
      script: "./dist/server.js", // Caminho do SERVIDOR
      env: { NODE_ENV: "production" }
    },
    {
      name: "pluvia-worker",
      script: "./dist/worker.js", // Caminho do WORKER
      env: { NODE_ENV: "production" }
    }
  ]
};