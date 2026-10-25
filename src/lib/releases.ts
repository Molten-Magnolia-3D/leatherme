import catalog from "@/lib/releases.json";

export type Release = {
  version: string;
  date: string;
  title: string;
  notes: string[];
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

export function githubSourceZipUrl(version: string): string {
  return `${REPOSITORY_URL}/archive/refs/tags/${releaseTag(version)}.zip`;
}

export function githubSourceZipName(version: string): string {
  return `leatherme-${releaseTag(version)}.zip`;
}
