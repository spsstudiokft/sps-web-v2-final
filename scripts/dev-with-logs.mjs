import { createWriteStream, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const projectRoot = resolve(scriptDirectory, "..");
const logsDirectory = resolve(projectRoot, "logs");

mkdirSync(logsDirectory, { recursive: true });

const outputLog = createWriteStream(resolve(logsDirectory, "server.out.log"), { flags: "a" });
const errorLog = createWriteStream(resolve(logsDirectory, "server.err.log"), { flags: "a" });
const tsxCli = resolve(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
const server = spawn(process.execPath, [tsxCli, "server.ts"], {
  cwd: projectRoot,
  stdio: ["inherit", "pipe", "pipe"],
});

server.stdout.pipe(process.stdout);
server.stdout.pipe(outputLog);
server.stderr.pipe(process.stderr);
server.stderr.pipe(errorLog);

const stopServer = (signal) => {
  if (!server.killed) server.kill(signal);
};

process.on("SIGINT", () => stopServer("SIGINT"));
process.on("SIGTERM", () => stopServer("SIGTERM"));

server.on("exit", (code, signal) => {
  outputLog.end();
  errorLog.end();
  if (signal) process.exit(0);
  process.exit(code ?? 1);
});

server.on("error", (error) => {
  console.error("Could not start the local server:", error);
  errorLog.end();
  outputLog.end();
  process.exit(1);
});
