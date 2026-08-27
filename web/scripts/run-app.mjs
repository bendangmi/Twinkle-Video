import path from "node:path";
import { fileURLToPath } from "node:url";

import { generationRuntimeEnvironment, superviseGenerationRuntime } from "./generation-runtime.mjs";
import { localDevelopmentBundlerFlag, localDevelopmentEnvironment } from "./local-development.mjs";

const mode = process.argv[2];
if (!["dev", "frontend", "backend"].includes(mode)) throw new Error("Usage: run-app.mjs <dev|frontend|backend>");

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextEntry = path.join(webRoot, "node_modules", "next", "dist", "bin", "next");
const localEnvironment = localDevelopmentEnvironment(mode, process.env);
const runtime = generationRuntimeEnvironment({ environment: localEnvironment, allowEphemeralToken: true });
const environment = runtime.environment;
if (runtime.ephemeralToken) console.log("Generated ephemeral maintenance and worker tokens for this local development process.");

process.exitCode = await superviseGenerationRuntime({
    app: { command: process.execPath, args: [nextEntry, "dev", localDevelopmentBundlerFlag(), "-H", environment.HOSTNAME, "-p", environment.PORT], cwd: webRoot },
    workerScript: mode === "frontend" ? undefined : path.join(webRoot, "scripts", "generation-worker.mjs"),
    environment,
});
