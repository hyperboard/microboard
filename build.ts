import { execSync } from "child_process";

// List of external dependencies
const externals = ["canvas", "jsdom"];
const externalArgs = externals.map((ext) => `--external ${ext}`).join(" ");

// Build commands
const commands = [
  "rimraf dist",
  `bun build ./src/browser.ts --outdir ./dist/esm --target browser --format esm ${externalArgs}`,
  `bun build ./src/browser.ts --outdir ./dist/cjs --target browser --format cjs ${externalArgs}`,
  `bun build ./src/node.ts --outdir ./dist/esm --target node --format esm ${externalArgs}`,
  `bun build ./src/node.ts --outdir ./dist/cjs --target node --format cjs ${externalArgs}`,
  `bun build ./src/index.ts --outdir ./dist/esm --target browser --format esm ${externalArgs}`,
  `bun build ./src/index.ts --outdir ./dist/cjs --target browser --format cjs ${externalArgs}`,
  "tsc --noEmit false --emitDeclarationOnly --declaration --declarationDir ./dist/types --skipLibCheck",
];

// Execute each command
for (const cmd of commands) {
  console.log(`Executing: ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (error) {
    console.error(`Command failed: ${cmd}`);
    process.exit(1);
  }
}

console.log("Build completed successfully!");
