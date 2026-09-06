-- Security hardening found during the community-web QA pass.

ALTER POLICY proposal_votes_insert_own
ON public.proposal_votes
TO authenticated
WITH CHECK (
  profile_id = (
    SELECT id FROM public.profiles
    WHERE auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )
  AND EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.thread_id = proposal_votes.thread_id
  )
);

CREATE POLICY forum_upload_tokens_delete_own
ON public.forum_upload_tokens
FOR DELETE TO authenticated
USING (
  profile_id = (
    SELECT id FROM public.profiles
    WHERE auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )
);

GRANT DELETE ON public.forum_upload_tokens TO authenticated;
REVOKE SELECT ON public.community_valid_upload_tokens FROM anonymous;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_length CHECK (length(display_name) BETWEEN 2 AND 40),
  ADD CONSTRAINT profiles_email_length CHECK (length(email) BETWEEN 3 AND 254),
  ADD CONSTRAINT profiles_avatar_url_safe CHECK (avatar_url IS NULL OR (length(avatar_url) <= 500 AND avatar_url ~ '^https://')),
  ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR length(bio) <= 1000);

ALTER TABLE public.threads
  ADD CONSTRAINT threads_title_length CHECK (length(title) BETWEEN 6 AND 120),
  ADD CONSTRAINT threads_slug_safe CHECK (length(slug) BETWEEN 1 AND 80 AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

ALTER TABLE public.posts
  ADD CONSTRAINT posts_body_length CHECK (length(body) BETWEEN 1 AND 10000);
