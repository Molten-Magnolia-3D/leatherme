import { connection } from "next/server";
import { APP_NAME, APP_VERSION, latestRelease } from "@/lib/releases";

export async function GET() {
  await connection();
  const latest = latestRelease();
  return Response.json(
    {
      name: APP_NAME,
      version: APP_VERSION,
      title: latest.title,
      releasedAt: latest.date,
      buildId:
        process.env.GITHUB_SHA ??
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.NEXT_PUBLIC_BUILD_ID ??
        "dev",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
