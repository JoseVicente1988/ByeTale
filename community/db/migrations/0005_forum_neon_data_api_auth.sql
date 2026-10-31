-- ByeTale Community forum: Neon Data API / Neon Auth RLS compatibility.
--
-- Keep this migration intentionally narrow: it only updates the identity checks
-- required by forum profile lookup/creation, thread creation and replies.

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
WITH CHECK (
  auth_user_id = (SELECT auth.user_id())
  AND role = 'member'::profile_role
);

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
