-- DRAFT ONLY — no aplicar hasta habilitar validación ZIP en forumupload.
-- Amplía la metadata multimedia de posts para adjuntos descargables ZIP.

ALTER TABLE public.posts
DROP CONSTRAINT IF EXISTS posts_media_kind_allowed,
DROP CONSTRAINT IF EXISTS posts_media_mime_allowed,
DROP CONSTRAINT IF EXISTS posts_media_url_safe;

ALTER TABLE public.posts
ADD CONSTRAINT posts_media_kind_allowed
CHECK (media_kind IS NULL OR media_kind IN ('video', 'audio', 'archive')),
ADD CONSTRAINT posts_media_mime_allowed
CHECK (
  media_mime IS NULL
  OR (media_kind = 'video' AND media_mime IN ('video/mp4', 'video/webm'))
  OR (media_kind = 'audio' AND media_mime IN ('audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4'))
  OR (media_kind = 'archive' AND media_mime = 'application/zip')
),
ADD CONSTRAINT posts_media_url_safe
CHECK (
  media_url IS NULL OR (
    length(media_url) <= 500
    AND media_url ~ '^https://br-lively-unit-aygkh67q[.]storage[.]c-5[.]us-east-2[.]aws[.]neon[.]tech/byetale-community-assets/forum/[0-9a-f-]{36}[.](mp4|webm|mp3|ogg|wav|m4a|zip)$'
  )
);

NOTIFY pgrst, 'reload schema';
