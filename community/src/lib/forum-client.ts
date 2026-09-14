"use client";

import { neon } from "./neon-client";

export type ForumProfile = { id: string; display_name: string };
type CommunityUser = { id: string; name?: string | null; email?: string | null; image?: string | null };
export type ForumAttachmentKind = "image" | "video" | "audio";
export type ForumAttachment = { url: string; kind: ForumAttachmentKind; mime: string };

const UPLOAD_URL = "https://br-lively-unit-aygkh67q-forumupload.compute.c-5.us-east-2.aws.neon.tech/";
const ALLOWED_TYPES: Record<string, { kind: ForumAttachmentKind; maxBytes: number }> = {
  "image/png": { kind: "image", maxBytes: 3 * 1024 * 1024 },
  "image/jpeg": { kind: "image", maxBytes: 3 * 1024 * 1024 },
  "image/webp": { kind: "image", maxBytes: 3 * 1024 * 1024 },
  "video/mp4": { kind: "video", maxBytes: 25 * 1024 * 1024 },
  "video/webm": { kind: "video", maxBytes: 25 * 1024 * 1024 },
  "audio/mpeg": { kind: "audio", maxBytes: 12 * 1024 * 1024 },
  "audio/ogg": { kind: "audio", maxBytes: 12 * 1024 * 1024 },
  "audio/wav": { kind: "audio", maxBytes: 12 * 1024 * 1024 },
  "audio/mp4": { kind: "audio", maxBytes: 12 * 1024 * 1024 },
};

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

export function forumAttachmentLimitLabel(file: File | null) {
  if (!file) return "";
  const rule = ALLOWED_TYPES[file.type];
  if (!rule) return "Formato no compatible";
  return `${Math.round(rule.maxBytes / 1024 / 1024)} MB máx.`;
}

export async function uploadForumAttachment(
  _profile: ForumProfile,
  file: File | null,
  _legacySessionToken?: string | null,
): Promise<ForumAttachment | null> {
  if (!file) return null;

  const rule = ALLOWED_TYPES[file.type];
  if (!rule) {
    throw new Error("Formato no compatible. Usa PNG/JPG/WEBP, MP4/WEBM o MP3/OGG/WAV/M4A.");
  }
  if (file.size > rule.maxBytes) {
    throw new Error(`El archivo supera el máximo de ${Math.round(rule.maxBytes / 1024 / 1024)} MB para ${rule.kind}.`);
  }

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

  const payload = await response.json() as { url?: string; kind?: ForumAttachmentKind; mime?: string; error?: string };
  if (!response.ok || !payload.url || !payload.kind || !payload.mime) {
    console.error("ByeTale forum attachment upload failed", response.status, payload.error);
    throw new Error(payload.error || "No se pudo subir el archivo.");
  }
  return { url: payload.url, kind: payload.kind, mime: payload.mime };
}

// Compatibilidad con código anterior que solo adjuntaba imágenes.
export async function uploadForumImage(
  profile: ForumProfile,
  file: File | null,
  legacySessionToken?: string | null,
) {
  const attachment = await uploadForumAttachment(profile, file, legacySessionToken);
  if (!attachment) return null;
  if (attachment.kind !== "image") throw new Error("El archivo adjunto no es una imagen.");
  return attachment.url;
}
