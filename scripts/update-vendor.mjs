// Copy the browser runtime of transformers.js and ONNX Runtime Web into extension/vendor.
// Run after `npm install` when upgrading @huggingface/transformers.
import fs from "node:fs";
import path from "node:path";
const tfDir = path.resolve("node_modules/@huggingface/transformers");
const ortDir = [path.join(tfDir, "node_modules/onnxruntime-web"), path.resolve("node_modules/onnxruntime-web")].find(fs.existsSync);
const out = path.resolve("extension/vendor");

const files = [
  [path.join(tfDir, "dist/transformers.min.js"), "transformers.min.js"],
  [path.join(ortDir, "dist/ort-wasm-simd-threaded.asyncify.mjs"), "ort-wasm-simd-threaded.asyncify.mjs"],
  [path.join(ortDir, "dist/ort-wasm-simd-threaded.asyncify.wasm"), "ort-wasm-simd-threaded.asyncify.wasm"],
];
fs.mkdirSync(out, { recursive: true });
for (const [from, name] of files) {
  fs.copyFileSync(from, path.join(out, name));
  console.log(`vendor/${name}  ${(fs.statSync(from).size / 1e6).toFixed(1)} MB`);
}
