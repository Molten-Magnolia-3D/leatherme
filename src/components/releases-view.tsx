"use client";

import { Download, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SiteChrome } from "@/components/site-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APP_VERSION,
  GITHUB_RELEASES_URL,
  RELEASES,
  appDownloadsFromAssets,
  githubReleaseUrl,
  preferredPlatform,
  type AppDownload,
  type GithubAsset,
  type Release,
} from "@/lib/releases";

type GithubRelease = {
  tag_name: string;
  html_url: string;
  assets: GithubAsset[];
};

export function ReleasesView() {
  const [remote, setRemote] = useState<GithubRelease[]>([]);
  const [platform] = useState<AppDownload["platform"] | null>(preferredPlatform);

  useEffect(() => {
    void fetch("https://api.github.com/repos/Molten-Magnolia-3D/leatherme/releases")
      .then((response) => (response.ok ? response.json() : []))
      .then((data: GithubRelease[]) => setRemote(Array.isArray(data) ? data : []))
      .catch(() => setRemote([]));
  }, []);

  const rows = useMemo(() => {
    const byTag = new Map(remote.map((item) => [item.tag_name.replace(/^v/, ""), item]));
    return RELEASES.map((release) => {
      const github = byTag.get(release.version) ?? null;
      return {
        release,
        github,
        downloads: appDownloadsFromAssets(github?.assets ?? []),
        page: github?.html_url ?? githubReleaseUrl(release.version),
      };
    });
  }, [remote]);

  const latest = rows[0];
  const suggested = latest?.downloads.find((item) => item.platform === platform) ?? latest?.downloads[0];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteChrome current="releases" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">GitHub downloads</p>
          <h1 className="font-display text-4xl">Releases</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Download the Leatherme desktop app from GitHub. Windows, macOS, and Linux builds are attached to each
            release. Installed copies update themselves when a new release is pushed.
          </p>
        </div>

        {suggested ? (
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle>Latest app · {latest.release.version}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <a href={suggested.url}>
                  <Download /> Download for {suggested.label}
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={GITHUB_RELEASES_URL}>
                  <ExternalLink /> All GitHub downloads
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              App installers appear here after GitHub finishes publishing the latest release. You can also open{" "}
              <a className="underline" href={GITHUB_RELEASES_URL}>
                github.com/Molten-Magnolia-3D/leatherme/releases
              </a>
              .
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {rows.map((row) => (
            <ReleaseCard key={row.release.version} {...row} />
          ))}
        </div>
      </main>
    </div>
  );
}

function ReleaseCard({
  release,
  downloads,
  page,
}: {
  release: Release;
  downloads: AppDownload[];
  page: string;
}) {
  const current = release.version === APP_VERSION;
  return (
    <Card className={current ? "border-primary/40" : undefined}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-xl">
            {release.version} · {release.title}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{release.date}</p>
        </div>
        {current ? <Badge className="border-primary/40 bg-primary/10 text-primary">Current</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {release.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {downloads.length ? (
            downloads.map((item) => (
              <Button key={item.url} asChild>
                <a href={item.url}>
                  <Download /> {item.label}
                </a>
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Desktop installers for this version are published on GitHub when the release build finishes.
            </p>
          )}
          <Button asChild variant="outline">
            <a href={page}>
              <ExternalLink /> GitHub release
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
