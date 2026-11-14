-- Forum multimedia attachments: keep legacy images and add validated video/audio metadata.

ALTER TABLE public.posts
ADD COLUMN media_url text,
ADD COLUMN media_kind text,
ADD COLUMN media_mime text;

ALTER TABLE public.posts
ADD CONSTRAINT posts_media_attachment_complete
CHECK (
  (media_url IS NULL AND media_kind IS NULL AND media_mime IS NULL)
  OR
  (media_url IS NOT NULL AND media_kind IS NOT NULL AND media_mime IS NOT NULL)
),
ADD CONSTRAINT posts_media_kind_allowed
CHECK (media_kind IS NULL OR media_kind IN ('video', 'audio')),
ADD CONSTRAINT posts_media_mime_allowed
CHECK (
  media_mime IS NULL
  OR (media_kind = 'video' AND media_mime IN ('video/mp4', 'video/webm'))
  OR (media_kind = 'audio' AND media_mime IN ('audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4'))
),
ADD CONSTRAINT posts_media_url_safe
CHECK (
  media_url IS NULL OR (
    length(media_url) <= 500
    AND media_url ~ '^https://br-lively-unit-aygkh67q[.]storage[.]c-5[.]us-east-2[.]aws[.]neon[.]tech/byetale-community-assets/forum/[0-9a-f-]{36}[.](mp4|webm|mp3|ogg|wav|m4a)$'
  )
);

GRANT INSERT (media_url, media_kind, media_mime) ON public.posts TO authenticated;

CREATE OR REPLACE VIEW public.community_public_posts WITH (security_barrier=true) AS
SELECT p.id, p.thread_id, p.body, p.is_first_post, p.edited_at, p.created_at,
       pr.display_name AS author, pr.avatar_url,
       EXISTS (SELECT 1 FROM public.official_responses r WHERE r.post_id = p.id) AS is_official,
       p.image_url,
       p.media_url,
       p.media_kind,
       p.media_mime
FROM public.posts p
JOIN public.profiles pr ON pr.id = p.author_id
WHERE p.deleted_at IS NULL;

GRANT SELECT ON public.community_public_posts TO anonymous, authenticated;

NOTIFY pgrst, 'reload schema';
