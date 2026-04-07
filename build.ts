import { execSync } from "child_process";
import { copyFile, mkdir, readdir, readFile, writeFile } from "fs/promises";
import { transform } from "lightningcss";
import { dirname, extname, join, relative } from "path";

// List of external dependencies
const externals = ["canvas", "jsdom", "slate", "slate-react"];
const externalArgs = externals.map((ext) => `--external ${ext}`).join(" ");

// Function to recursively find all CSS files in a directory
async function findCSSFiles(dir: string): Promise<string[]> {
  const cssFiles: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await findCSSFiles(fullPath);
        cssFiles.push(...subFiles);
      } else if (entry.isFile() && extname(entry.name) === ".css") {
        cssFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }

  return cssFiles;
}

async function findFiles(
  dir: string,
  predicate: (fullPath: string) => boolean,
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await findFiles(fullPath, predicate));
      } else if (entry.isFile() && predicate(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }

  return files;
}

// Function to bundle CSS files using Lightning CSS
async function bundleCSS(): Promise<void> {
  console.log("🔍 Scanning for CSS files...");

  const cssFiles = await findCSSFiles("./src");
  console.log(
    `📁 Found ${cssFiles.length} CSS files:`,
    cssFiles.map((f) => f.replace("./src/", ""))
  );

  if (cssFiles.length === 0) {
    console.log("⚠️ No CSS files found, skipping CSS bundling");
    return;
  }

  // Read all CSS files
  const cssContents = await Promise.all(
    cssFiles.map(async (file) => {
      const content = await readFile(file, "utf-8");
      return { file, content };
    })
  );

  // Separate @import statements and other CSS
  const imports: string[] = [];
  const otherCSS: string[] = [];

  cssContents.forEach(({ file, content }) => {
    const relativePath = file.replace("./src/", "");
    const lines = content.split("\n");
    const fileImports: string[] = [];
    const fileOtherCSS: string[] = [];

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("@import")) {
        fileImports.push(line);
      } else {
        fileOtherCSS.push(line);
      }
    });

    if (fileImports.length > 0) {
      imports.push(`/* ${relativePath} imports */`);
      imports.push(...fileImports);
    }

    if (fileOtherCSS.some((line) => line.trim().length > 0)) {
      otherCSS.push(`/* ${relativePath} */`);
      otherCSS.push(fileOtherCSS.join("\n"));
    }
  });

  // Combine CSS with imports at the top
  const combinedCSS = [...imports, "", ...otherCSS].join("\n");

  console.log("⚡ Processing CSS with Lightning CSS...");

  // Transform CSS using Lightning CSS
  const result = transform({
    filename: "bundle.css",
    code: Buffer.from(combinedCSS),
    minify: true,
    targets: {
      android: 0,
      chrome: 0,
      edge: 0,
      firefox: 0,
      ios_saf: 0,
      safari: 0,
    },
  });

  // Ensure dist directory exists
  const outputPath = "./dist/microboard.css";
  await mkdir("./dist", { recursive: true });
  await writeFile(outputPath, result.code);

  console.log(`✅ CSS bundled successfully to ${outputPath}`);
  console.log(`📊 Bundle size: ${(result.code.length / 1024).toFixed(2)} KB`);
}

function toSvgDataUri(svg: string): string {
  const compactSvg = svg.replace(/\r?\n/g, "").replace(/\s{2,}/g, " ").trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(compactSvg)}`;
}

async function publishOverlayIcons(): Promise<void> {
  console.log("🖼️ Publishing overlay icon assets...");

  const svgFiles = [
    ...(await findFiles("./src", (fullPath) => fullPath.endsWith(".icon.svg"))),
    "./src/Overlay/overlay-icons.svg",
  ].sort();

  const manifestEntries = await Promise.all(svgFiles.map(async (sourcePath) => {
    const relativeFromSrc = relative("./src", sourcePath).replaceAll("\\", "/");
    const publishedPath = `overlay-icons/${relativeFromSrc}`;
    const destinationPath = join("./dist", publishedPath);
    await mkdir(dirname(destinationPath), { recursive: true });
    await copyFile(sourcePath, destinationPath);
    const svg = await readFile(sourcePath, "utf-8");
    return [publishedPath, toSvgDataUri(svg)] as const;
  }));

  const manifestObject = Object.fromEntries(manifestEntries);
  const manifestJson = JSON.stringify(manifestObject, null, 2);
  const esmModule = `export const overlayIconManifest = ${manifestJson};\nexport function getOverlayIconAsset(path) {\n  return overlayIconManifest[path];\n}\n`;
  const cjsModule = `"use strict";\nconst overlayIconManifest = ${manifestJson};\nfunction getOverlayIconAsset(path) {\n  return overlayIconManifest[path];\n}\nmodule.exports = { overlayIconManifest, getOverlayIconAsset };\n`;
  const typesModule = `export declare const overlayIconManifest: Record<string, string>;\nexport declare function getOverlayIconAsset(path: string): string | undefined;\n`;

  await mkdir("./dist/esm", { recursive: true });
  await mkdir("./dist/cjs", { recursive: true });
  await mkdir("./dist/types", { recursive: true });
  await writeFile("./dist/esm/overlayIconManifest.js", esmModule);
  await writeFile("./dist/cjs/overlayIconManifest.js", cjsModule);
  await writeFile("./dist/types/overlayIconManifest.d.ts", typesModule);

  console.log(`✅ Published ${manifestEntries.length} overlay icon assets`);
}

// Build commands
const commands = [
  "rimraf dist",
  `bun build ./src/browser.ts --outdir ./dist/esm --target browser --format esm ${externalArgs}`,
  `bun build ./src/browser.ts --outdir ./dist/cjs --target browser --format cjs ${externalArgs}`,
  `bun build ./src/node.ts --outdir ./dist/esm --target node --format esm ${externalArgs}`,
  `bun build ./src/node.ts --outdir ./dist/cjs --target node --format cjs ${externalArgs}`,
  `bun build ./src/index.ts --outdir ./dist/esm --target browser --format esm ${externalArgs}`,
  `bun build ./src/index.ts --outdir ./dist/cjs --target browser --format cjs ${externalArgs}`,
  `bun build ./src/protocol.ts --outdir ./dist/esm --target browser --format esm ${externalArgs}`,
  `bun build ./src/protocol.ts --outdir ./dist/cjs --target browser --format cjs ${externalArgs}`,
];

// Execute build process
async function build() {
  try {
    // First, clean the dist directory
    console.log("🧹 Cleaning dist directory...");
    execSync("rimraf dist", { stdio: "inherit" });

    // Bundle CSS files
    await bundleCSS();

    // Execute JavaScript build commands
    console.log("🔨 Building JavaScript bundles...");
    for (const cmd of commands.slice(1)) {
      // Skip rimraf since we already did it
      console.log(`Executing: ${cmd}`);
      execSync(cmd, { stdio: "inherit" });
    }

    // Generate TypeScript declarations
    console.log("📝 Generating TypeScript declarations...");
    execSync(
      "bunx tsc -p tsconfig.json --noEmit false --emitDeclarationOnly; bunx tsc-alias -p tsconfig.json",
      { stdio: "inherit" }
    );

    await publishOverlayIcons();

    console.log("🎉 Build completed successfully!");
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

// Run the build
build();
