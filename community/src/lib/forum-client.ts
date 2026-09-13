"use client";

import { neon } from "./neon-client";

export type ForumProfile = { id: string; display_name: string };
type CommunityUser = { id: string; name?: string | null; email?: string | null; image?: string | null };

const UPLOAD_URL = "https://br-lively-unit-aygkh67q-forumupload.compute.c-5.us-east-2.aws.neon.tech/";

export function slugifyForumTitle(title: string) {
  const base = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "hilo";
  return `${base}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

export async function ensureForumProfile(user: CommunityUser): Promise<ForumProfile> {
  const existing = await neon.from("profiles").select("id,display_name").eq("auth_user_id", user.id).limit(1);
  if (existing.error) throw existing.error;
  if (existing.data?.[0]) return existing.data[0] as ForumProfile;
  const created = await neon.from("profiles").insert({
    auth_user_id: user.id, email: user.email,
    display_name: (user.name || user.email?.split("@")[0] || "Miembro ByeTale").slice(0, 40),
    avatar_url: user.image ?? null,
  }).select("id,display_name").single();
  if (created.error || !created.data) throw created.error ?? new Error("No se pudo crear el perfil.");
  return created.data as ForumProfile;
}

export async function uploadForumImage(
  _profile: ForumProfile,
  file: File | null,
  _legacySessionToken?: string | null,
) {
  if (!file) return null;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("La imagen debe ser PNG, JPG o WEBP.");
  if (file.size > 3 * 1024 * 1024) throw new Error("La imagen no puede superar los 3 MB.");

  const authSession = await neon.auth.getSession();
  const jwt = authSession.data?.session?.token ?? null;
  if (!jwt) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": file.type,
    },
    body: file,
  });

  const payload = await response.json() as { url?: string; error?: string };
  if (!response.ok || !payload.url) {
    console.error("ByeTale forum image upload failed", response.status, payload.error);
    return null;
  }
  return payload.url;
}
