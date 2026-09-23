import { NextResponse } from "next/server";

const REPO = "JoseVicente1988/ByeTale";

type GitHubAsset = {
  name?: string;
  browser_download_url?: string;
  size?: number;
  download_count?: number;
  content_type?: string;
};

type GitHubRelease = {
  tag_name?: string;
  name?: string;
  body?: string;
  published_at?: string;
  html_url?: string;
  assets?: GitHubAsset[];
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "ByeTale-Community",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { available: false, error: "No se pudo consultar la última build." },
        { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
      );
    }

    const release = (await response.json()) as GitHubRelease;
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const apk = assets.find((asset) =>
      String(asset.name ?? "").toLowerCase().endsWith(".apk"),
    );

    if (!apk?.browser_download_url) {
      return NextResponse.json(
        {
          available: false,
          version: release.name ?? release.tag_name ?? null,
          release_url: release.html_url ?? null,
          published_at: release.published_at ?? null,
          error: "La release más reciente no incluye un APK descargable.",
        },
        { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
      );
    }

    return NextResponse.json(
      {
        available: true,
        version: release.name ?? release.tag_name ?? "Última build",
        tag: release.tag_name ?? null,
        published_at: release.published_at ?? null,
        notes: release.body ?? "",
        release_url: release.html_url ?? null,
        download_url: apk.browser_download_url,
        file_name: apk.name ?? "ByeTale.apk",
        size_bytes: Number(apk.size ?? 0),
        download_count: Number(apk.download_count ?? 0),
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
    );
  } catch {
    return NextResponse.json(
      { available: false, error: "No se pudo consultar la última build." },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  }
}
