const EXACT_ALLOWED_ORIGINS = new Set([
  "https://byetale-community.vercel.app",
  "https://byetale-community-josevicente1988s-projects.vercel.app",
]);

const BYETALE_VERCEL_PREVIEW_ORIGIN =
  /^https:\/\/byetale-community(?:-[a-z0-9-]+)?-josevicente1988s-projects\.vercel\.app$/i;

const BUCKET = "byetale-community-assets";
const MAX_BYTES = 3 * 1024 * 1024;

function isAllowedOrigin(origin) {
  return EXACT_ALLOWED_ORIGINS.has(origin) || BYETALE_VERCEL_PREVIEW_ORIGIN.test(origin);
}

function cors(origin) {
  const headers = {
    "Access-Control-Allow-Headers": "authorization,content-type,x-upload-token",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function hex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return crypto.subtle.digest("SHA-256", bytes);
}

async function hmac(key, value) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? new TextEncoder().encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
}

function detectImage(bytes, declaredType) {
  if (declaredType === "image/png" && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return { ext: "png", type: "image/png" };
  if (declaredType === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { ext: "jpg", type: "image/jpeg" };
  if (declaredType === "image/webp" && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP")
    return { ext: "webp", type: "image/webp" };
  return null;
}

async function validateAuthenticatedProfile(authorization) {
  const url = `${process.env.NEON_DATA_API_URL}/profiles?select=id&limit=1`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", Authorization: authorization },
  });
  if (!response.ok) return false;
  const rows = await response.json();
  return Array.isArray(rows) && rows.length === 1;
}

async function uploadToStorage(key, body, contentType) {
  const endpoint = new URL(process.env.AWS_ENDPOINT_URL_S3);
  const region = process.env.AWS_REGION;
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKey || !secretKey) throw new Error("Storage is not configured");

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const path = `/${BUCKET}/${key}`;
  const payloadHash = hex(await sha256(body));
  const canonicalHeaders = `content-type:${contentType}\nhost:${endpoint.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `PUT\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${date}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${hex(await sha256(canonicalRequest))}`;
  const dateKey = await hmac(`AWS4${secretKey}`, date);
  const regionKey = await hmac(dateKey, region);
  const serviceKey = await hmac(regionKey, "s3");
  const signingKey = await hmac(serviceKey, "aws4_request");
  const signature = hex(await hmac(signingKey, stringToSign));
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`${endpoint.origin}${path}`, {
    method: "PUT",
    body,
    headers: {
      Authorization: authorization,
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
  });
  if (!response.ok) throw new Error(`Storage rejected upload: ${response.status}`);
  return `${endpoint.origin}${path}`;
}

export default {
  async fetch(request) {
    const origin = request.headers.get("origin") || "";
    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(origin)) return json({ error: "Origen no permitido." }, 403, origin);
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (request.method !== "POST") return json({ error: "Método no permitido." }, 405, origin);
    if (!isAllowedOrigin(origin)) return json({ error: "Origen no permitido." }, 403, origin);

    const authorization = request.headers.get("authorization") || "";
    if (!/^Bearer\s+\S+$/i.test(authorization))
      return json({ error: "Debes iniciar sesión para subir una imagen." }, 401, origin);

    const declaredType = (request.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const body = new Uint8Array(await request.arrayBuffer());
    if (!body.length || body.length > MAX_BYTES) return json({ error: "La imagen debe ocupar como máximo 3 MB." }, 413, origin);
    const image = detectImage(body, declaredType);
    if (!image) return json({ error: "Solo se admiten imágenes PNG, JPG o WEBP válidas." }, 415, origin);

    if (!(await validateAuthenticatedProfile(authorization)))
      return json({ error: "Tu sesión no es válida para subir imágenes." }, 401, origin);

    try {
      const key = `forum/${crypto.randomUUID()}.${image.ext}`;
      const url = await uploadToStorage(key, body, image.type);
      return json({ url }, 201, origin);
    } catch (error) {
      console.error(error);
      return json({ error: "No se pudo guardar la imagen. Inténtalo de nuevo." }, 500, origin);
    }
  },
};
