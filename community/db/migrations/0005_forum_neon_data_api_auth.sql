-- ByeTale Community forum: Neon Data API / Neon Auth RLS compatibility.
--
-- Modern Neon Data API validates the authenticated JWT and exposes the current
-- user through auth.user_id().  The original forum policies predated the current
-- integration and read request.jwt.claims directly, which prevented authenticated
-- forum writes on the current Data API setup.

CREATE EXTENSION IF NOT EXISTS pg_session_jwt;

ALTER POLICY profiles_read_own
ON public.profiles
TO authenticated
USING (auth_user_id = (SELECT auth.user_id()));

ALTER POLICY profiles_insert_own
ON public.profiles
TO authenticated
WITH CHECK (
  auth_user_id = (SELECT auth.user_id())
  AND role = 'member'::profile_role
);

ALTER POLICY profiles_update_own
ON public.profiles
TO authenticated
USING (auth_user_id = (SELECT auth.user_id()))
WITH CHECK (auth_user_id = (SELECT auth.user_id()));

ALTER POLICY threads_insert_own
ON public.threads
TO authenticated
WITH CHECK (
  author_id = (
    SELECT id FROM public.profiles
    WHERE auth_user_id = (SELECT auth.user_id())
  )
  AND type IN (
    'discussion'::thread_type,
    'proposal'::thread_type,
    'bug'::thread_type,
    'casting'::thread_type
  )
  AND EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.id = category_id
      AND c.is_read_only = false
  )
);

ALTER POLICY posts_insert_own
ON public.posts
TO authenticated
WITH CHECK (
  author_id = (
    SELECT id FROM public.profiles
    WHERE auth_user_id = (SELECT auth.user_id())
  )
  AND EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = thread_id
      AND t.deleted_at IS NULL
      AND t.locked = false
  )
);

ALTER POLICY proposals_insert_own
ON public.proposals
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = thread_id
      AND t.type = 'proposal'::thread_type
      AND t.author_id = (
        SELECT id FROM public.profiles
        WHERE auth_user_id = (SELECT auth.user_id())
      )
  )
);

ALTER POLICY bug_reports_insert_own
ON public.bug_reports
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = thread_id
      AND t.type = 'bug'::thread_type
      AND t.author_id = (
        SELECT id FROM public.profiles
        WHERE auth_user_id = (SELECT auth.user_id())
      )
  )
);

ALTER POLICY proposal_votes_read_own
ON public.proposal_votes
TO authenticated
USING (
  profile_id = (
    SELECT id FROM public.profiles
    WHERE auth_user_id = (SELECT auth.user_id())
  )
);

ALTER POLICY proposal_votes_insert_own
ON public.proposal_votes
TO authenticated
WITH CHECK (
  profile_id = (
    SELECT id FROM public.profiles
    WHERE auth_user_id = (SELECT auth.user_id())
  )
  AND EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.thread_id = proposal_votes.thread_id
  )
);

ALTER POLICY proposal_votes_delete_own
ON public.proposal_votes
TO authenticated
USING (
  profile_id = (
    SELECT id FROM public.profiles
    WHERE auth_user_id = (SELECT auth.user_id())
  )
);

ALTER POLICY forum_upload_tokens_insert_own
ON public.forum_upload_tokens
TO authenticated
WITH CHECK (
  profile_id = (
    SELECT id FROM public.profiles
    WHERE auth_user_id = (SELECT auth.user_id())
  )
);

ALTER POLICY forum_upload_tokens_delete_own
ON public.forum_upload_tokens
TO authenticated
USING (
  profile_id = (
    SELECT id FROM public.profiles
    WHERE auth_user_id = (SELECT auth.user_id())
  )
);
