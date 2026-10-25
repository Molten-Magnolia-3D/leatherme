"use client";

import { Download, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { InstallApp } from "@/components/install-app";
import { SiteChrome } from "@/components/site-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APP_VERSION,
  GITHUB_RELEASES_URL,
  RELEASES,
  githubReleaseUrl,
  githubSourceZipUrl,
  type Release,
} from "@/lib/releases";

type GithubRelease = {
  tag_name: string;
  html_url: string;
  zipball_url: string;
  published_at: string | null;
};

export function ReleasesView() {
  const [remote, setRemote] = useState<GithubRelease[]>([]);

  useEffect(() => {
    void fetch("https://api.github.com/repos/Molten-Magnolia-3D/leatherme/releases")
      .then((response) => (response.ok ? response.json() : []))
      .then((data: GithubRelease[]) => setRemote(Array.isArray(data) ? data : []))
      .catch(() => setRemote([]));
  }, []);

  const rows = useMemo(() => {
    const byTag = new Map(remote.map((item) => [item.tag_name.replace(/^v/, ""), item]));
    return RELEASES.map((release) => ({
      release,
      github: byTag.get(release.version) ?? null,
    }));
  }, [remote]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteChrome current="releases" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Version history</p>
          <h1 className="font-display text-4xl">Releases</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Download Leatherme to this computer or phone. Installed copies update themselves when a new version is
            pushed.
          </p>
        </div>

        <InstallApp />

        <div className="space-y-4">
          {rows.map(({ release, github }) => (
            <ReleaseCard key={release.version} release={release} github={github} />
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          GitHub also keeps the same history at{" "}
          <a href={GITHUB_RELEASES_URL} className="underline">
            {GITHUB_RELEASES_URL.replace("https://", "")}
          </a>
          .
        </p>
      </main>
    </div>
  );
}

function ReleaseCard({
  release,
  github,
}: {
  release: Release;
  github: GithubRelease | null;
}) {
  const current = release.version === APP_VERSION;
  const zip = github?.zipball_url ?? githubSourceZipUrl(release.version);
  const page = github?.html_url ?? githubReleaseUrl(release.version);

  return (
    <Card className={current ? "border-primary/50" : undefined}>
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
          <Button asChild>
            <a href={zip}>
              <Download /> Download {release.version}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={page}>
              <ExternalLink /> Release notes
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
