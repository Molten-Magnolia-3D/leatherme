import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import catalog from "@/lib/releases.json";
import {
  APP_VERSION,
  RELEASES,
  appDownloadsFromAssets,
  githubReleaseUrl,
  latestRelease,
  platformForAsset,
  releaseTag,
} from "@/lib/releases";

describe("release catalog", () => {
  it("matches the package version", () => {
    const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")) as {
      version: string;
    };
    expect(APP_VERSION).toBe(pkg.version);
    expect(catalog.current).toBe(pkg.version);
  });

  it("lists newest first and includes the current version", () => {
    expect(RELEASES.length).toBeGreaterThan(0);
    expect(latestRelease().version).toBe(APP_VERSION);
    expect(RELEASES.map((release) => release.version)).toContain("0.1.0");
  });

  it("builds GitHub release URLs", () => {
    expect(releaseTag("0.3.0")).toBe("v0.3.0");
    expect(githubReleaseUrl("0.3.0")).toMatch(/\/releases\/tag\/v0.3.0$/);
  });

  it("maps GitHub assets to desktop app downloads", () => {
    expect(platformForAsset("Leatherme Setup 0.3.0.exe")).toBe("windows");
    expect(platformForAsset("Leatherme-0.3.0.dmg")).toBe("mac");
    expect(platformForAsset("Leatherme-0.3.0.AppImage")).toBe("linux");
    expect(platformForAsset("latest.yml")).toBeNull();
    const downloads = appDownloadsFromAssets([
      { name: "Leatherme-0.3.0.AppImage", browser_download_url: "https://example.com/app.AppImage", size: 1 },
      { name: "Leatherme Setup 0.3.0.exe", browser_download_url: "https://example.com/app.exe", size: 1 },
      { name: "latest.yml", browser_download_url: "https://example.com/latest.yml", size: 1 },
    ]);
    expect(downloads.map((item) => item.platform)).toEqual(["windows", "linux"]);
  });
});
