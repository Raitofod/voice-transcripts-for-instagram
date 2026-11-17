// Package extension/ into dist/voice-transcripts-<version>.zip for the Chrome Web Store or a GitHub release.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const { version } = JSON.parse(fs.readFileSync("extension/manifest.json", "utf8"));
const zip = `voice-transcripts-${version}.zip`;
fs.mkdirSync("dist", { recursive: true });
fs.rmSync(`dist/${zip}`, { force: true });

if (process.platform === "win32") {
  // bsdtar ships with Windows 10+ and, unlike Compress-Archive, writes forward-slash paths.
  execFileSync("tar", ["-a", "-cf", `../dist/${zip}`, "*"], { cwd: "extension", stdio: "inherit" });
} else {
  execFileSync("zip", ["-qr", `../dist/${zip}`, "."], { cwd: "extension", stdio: "inherit" });
}
console.log(`dist/${zip}`);
