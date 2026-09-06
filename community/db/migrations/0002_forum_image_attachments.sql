-- Forum image attachments: short-lived upload capabilities and safe public image URLs.

CREATE TABLE public.forum_upload_tokens (
  token uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_upload_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY forum_upload_tokens_insert_own
ON public.forum_upload_tokens
FOR INSERT TO authenticated
WITH CHECK (
  profile_id = (
    SELECT id FROM public.profiles
    WHERE auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )
);

GRANT INSERT (token, profile_id) ON public.forum_upload_tokens TO authenticated;

CREATE VIEW public.community_valid_upload_tokens WITH (security_barrier=true) AS
SELECT token, expires_at
FROM public.forum_upload_tokens
WHERE expires_at > now();

GRANT SELECT ON public.community_valid_upload_tokens TO anonymous, authenticated;

ALTER TABLE public.posts ADD COLUMN image_url text;

ALTER TABLE public.posts
ADD CONSTRAINT posts_image_url_safe
CHECK (
  image_url IS NULL OR (
    length(image_url) <= 500
    AND image_url ~ '^https://br-lively-unit-aygkh67q[.]storage[.]c-5[.]us-east-2[.]aws[.]neon[.]tech/byetale-community-assets/forum/[0-9a-f-]{36}[.](png|jpg|webp)$'
  )
);

GRANT INSERT (image_url) ON public.posts TO authenticated;

CREATE OR REPLACE VIEW public.community_public_posts WITH (security_barrier=true) AS
SELECT p.id, p.thread_id, p.body, p.is_first_post, p.edited_at, p.created_at,
       pr.display_name AS author, pr.avatar_url,
       EXISTS (SELECT 1 FROM public.official_responses r WHERE r.post_id = p.id) AS is_official,
       p.image_url
FROM public.posts p
JOIN public.profiles pr ON pr.id = p.author_id
WHERE p.deleted_at IS NULL;

GRANT SELECT ON public.community_public_posts TO anonymous, authenticated;
