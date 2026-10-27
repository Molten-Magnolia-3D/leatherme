import catalog from "@/lib/releases.json";

export type Release = {
  version: string;
  date: string;
  title: string;
  notes: string[];
};

export type GithubAsset = {
  name: string;
  browser_download_url: string;
  size: number;
};

export type AppDownload = {
  label: string;
  platform: "windows" | "mac" | "linux";
  url: string;
  name: string;
};

export const APP_NAME = catalog.name;
export const APP_VERSION = catalog.current;
export const REPOSITORY_URL = catalog.repository;
export const GITHUB_RELEASES_URL = catalog.releasesUrl;
export const RELEASES: Release[] = catalog.releases;

export function latestRelease(): Release {
  return RELEASES[0];
}

export function releaseTag(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}

export function githubReleaseUrl(version: string): string {
  return `${REPOSITORY_URL}/releases/tag/${releaseTag(version)}`;
}

export function appDownloadsFromAssets(assets: GithubAsset[]): AppDownload[] {
  const downloads: AppDownload[] = [];
  for (const asset of assets) {
    const platform = platformForAsset(asset.name);
    if (!platform) continue;
    downloads.push({
      label: platform === "windows" ? "Windows" : platform === "mac" ? "macOS" : "Linux",
      platform,
      url: asset.browser_download_url,
      name: asset.name,
    });
  }
  const order = { windows: 0, mac: 1, linux: 2 };
  return downloads.sort((a, b) => order[a.platform] - order[b.platform]);
}

export function platformForAsset(name: string): AppDownload["platform"] | null {
  if (/\.(exe|msi)$/i.test(name) || (/win/i.test(name) && !/\.yml$/i.test(name))) return "windows";
  if (/\.(dmg|pkg)$/i.test(name) || (/(mac|darwin)/i.test(name) && !/\.yml$/i.test(name))) return "mac";
  if (/\.(AppImage|deb|rpm)$/i.test(name) || (/linux/i.test(name) && !/\.yml$/i.test(name))) return "linux";
  return null;
}

export function preferredPlatform(): AppDownload["platform"] | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "mac";
  if (/Linux|X11/i.test(ua)) return "linux";
  return null;
}
