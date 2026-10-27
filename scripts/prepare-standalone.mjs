import { cpSync, existsSync } from "node:fs";
import path from "node:path";

const standalone = path.resolve(".next/standalone");
if (!existsSync(path.join(standalone, "server.js"))) {
  throw new Error("Missing .next/standalone/server.js. Run npm run build first.");
}

cpSync(path.resolve("public"), path.join(standalone, "public"), { recursive: true });
cpSync(path.resolve(".next/static"), path.join(standalone, ".next/static"), { recursive: true });
console.log("Standalone app folder is ready for Electron.");
