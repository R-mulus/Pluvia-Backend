module.exports = {
  apps: [
    {
      name: "pluvia-server",
      script: "./dist/server.js", // Caminho do servidor compilado
      env: { NODE_ENV: "production" }
    },
    {
      name: "pluvia-worker",
      script: "./dist/worker.js", // Caminho do worker compilado
      env: { NODE_ENV: "production" }
    }
  ]
};