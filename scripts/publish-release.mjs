import { execSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const pkgPath = "package.json";
const catalogPath = "src/lib/releases.json";
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

function sh(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function tagExists(tag) {
  try {
    sh(`git rev-parse ${tag}`);
    return true;
  } catch {
    return false;
  }
}

function bumpPatch(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${(patch ?? 0) + 1}`;
}

function commitNotes() {
  let range = "";
  try {
    const lastTag = sh("git describe --tags --abbrev=0");
    range = `${lastTag}..HEAD`;
  } catch {
    range = "HEAD";
  }
  const log = sh(`git log ${range} --pretty=format:%s`);
  return log
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("chore(release)"))
    .slice(0, 12);
}

let version = pkg.version;
const notes = commitNotes();
if (tagExists(`v${version}`)) {
  version = bumpPatch(version);
  pkg.version = version;
  catalog.current = version;
  catalog.releases.unshift({
    version,
    date: new Date().toISOString().slice(0, 10),
    title: "Automatic update",
    notes: notes.length ? notes : ["Maintenance update from the latest push to main."],
  });
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  sh("git add package.json src/lib/releases.json");
  sh(`git commit -m "chore(release): ${version}"`);
  sh("git push origin HEAD");
}

const tag = `v${version}`;
const entry = catalog.releases.find((release) => release.version === version);
const body = [
  entry ? `## ${entry.title}` : `## Leatherme ${tag}`,
  "",
  ...(entry?.notes ?? notes).map((note) => `- ${note}`),
  "",
  "Download the desktop app from this GitHub release:",
  "- Windows: `Leatherme Setup *.exe`",
  "- macOS: `Leatherme-*.dmg`",
  "- Linux: `Leatherme-*.AppImage`",
  "",
  "Installed copies check this GitHub release and update themselves.",
].join("\n");

if (!tagExists(tag)) {
  sh(`git tag ${tag}`);
  sh(`git push origin ${tag}`);
}

try {
  sh(`gh release view ${tag}`);
  sh(`gh release edit ${tag} --title "Leatherme ${tag}" --notes ${JSON.stringify(body)} --latest`);
} catch {
  sh(`gh release create ${tag} --title "Leatherme ${tag}" --notes ${JSON.stringify(body)} --latest`);
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`);
}

console.log(`Published ${tag}`);
