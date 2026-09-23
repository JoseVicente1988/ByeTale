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
  draft?: boolean;
  prerelease?: boolean;
  assets?: GitHubAsset[];
};

type PlatformKey = "android" | "windows";

type PlatformBuild = {
  available: boolean;
  platform: PlatformKey;
  label: string;
  format: string;
  version?: string | null;
  tag?: string | null;
  published_at?: string | null;
  release_url?: string | null;
  download_url?: string | null;
  file_name?: string | null;
  size_bytes?: number;
  download_count?: number;
};

export const dynamic = "force-dynamic";

function assetForPlatform(release: GitHubRelease, platform: PlatformKey): GitHubAsset | undefined {
  const assets = Array.isArray(release.assets) ? release.assets : [];

  if (platform === "android") {
    return assets.find((asset) => String(asset.name ?? "").toLowerCase().endsWith(".apk"));
  }

  return assets.find((asset) => {
    const name = String(asset.name ?? "").toLowerCase();
    if (name.endsWith(".exe") || name.endsWith(".msi")) return true;
    if (!name.endsWith(".zip") && !name.endsWith(".7z")) return false;
    return /(windows|win64|win32|win-x64|windows-x64|pc)/i.test(name);
  });
}

function findLatestPlatformBuild(releases: GitHubRelease[], platform: PlatformKey): PlatformBuild {
  for (const release of releases) {
    if (release.draft) continue;
    const asset = assetForPlatform(release, platform);
    if (!asset?.browser_download_url) continue;

    return {
      available: true,
      platform,
      label: platform === "android" ? "Android" : "Windows",
      format: platform === "android" ? "APK" : String(asset.name ?? "").toLowerCase().endsWith(".msi") ? "MSI" : String(asset.name ?? "").toLowerCase().endsWith(".exe") ? "EXE" : "ZIP",
      version: release.name ?? release.tag_name ?? "Última build",
      tag: release.tag_name ?? null,
      published_at: release.published_at ?? null,
      release_url: release.html_url ?? null,
      download_url: asset.browser_download_url,
      file_name: asset.name ?? (platform === "android" ? "ByeTale.apk" : "ByeTale-Windows-x64.zip"),
      size_bytes: Number(asset.size ?? 0),
      download_count: Number(asset.download_count ?? 0),
    };
  }

  return {
    available: false,
    platform,
    label: platform === "android" ? "Android" : "Windows",
    format: platform === "android" ? "APK" : "ZIP / EXE",
  };
}

export async function GET() {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "ByeTale-Community",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { available: false, platforms: null, error: "No se pudo consultar la última build." },
        { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
      );
    }

    const releases = (await response.json()) as GitHubRelease[];
    const android = findLatestPlatformBuild(releases, "android");
    const windows = findLatestPlatformBuild(releases, "windows");
    const newest = [windows, android]
      .filter((build) => build.available)
      .sort((a, b) => String(b.published_at ?? "").localeCompare(String(a.published_at ?? "")))[0];

    return NextResponse.json(
      {
        available: android.available || windows.available,
        version: newest?.version ?? null,
        tag: newest?.tag ?? null,
        published_at: newest?.published_at ?? null,
        release_url: newest?.release_url ?? null,
        platforms: { windows, android },
        // Compatibilidad temporal con el contrato Android anterior.
        download_url: android.download_url ?? null,
        file_name: android.file_name ?? null,
        size_bytes: android.size_bytes ?? 0,
        download_count: android.download_count ?? 0,
        error: android.available || windows.available
          ? null
          : "Todavía no hay una build pública preparada para descargar.",
      },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
    );
  } catch {
    return NextResponse.json(
      { available: false, platforms: null, error: "No se pudo consultar la última build." },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  }
}
