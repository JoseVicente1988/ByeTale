-- ByeTale Community forum security migration.
-- Tested on a temporary Neon branch before production application.

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_authenticated_read ON public.categories FOR SELECT TO authenticated USING (true);

CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated USING (auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'));
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub') AND role = 'member'::profile_role);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')) WITH CHECK (auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub') AND role = 'member'::profile_role);

CREATE POLICY threads_authenticated_read ON public.threads FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY threads_insert_own ON public.threads FOR INSERT TO authenticated WITH CHECK (
  author_id = (SELECT id FROM public.profiles WHERE auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))
  AND type IN ('discussion'::thread_type, 'proposal'::thread_type, 'bug'::thread_type, 'casting'::thread_type)
  AND EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_id AND c.is_read_only = false)
);

CREATE POLICY posts_authenticated_read ON public.posts FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY posts_insert_own ON public.posts FOR INSERT TO authenticated WITH CHECK (
  author_id = (SELECT id FROM public.profiles WHERE auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))
  AND EXISTS (SELECT 1 FROM public.threads t WHERE t.id = thread_id AND t.deleted_at IS NULL AND t.locked = false)
);

CREATE POLICY proposals_authenticated_read ON public.proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY proposals_insert_own ON public.proposals FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = thread_id
      AND t.type = 'proposal'::thread_type
      AND t.author_id = (SELECT id FROM public.profiles WHERE auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))
  )
);

CREATE POLICY bug_reports_authenticated_read ON public.bug_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY bug_reports_insert_own ON public.bug_reports FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = thread_id
      AND t.type = 'bug'::thread_type
      AND t.author_id = (SELECT id FROM public.profiles WHERE auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))
  )
);

CREATE POLICY proposal_votes_read_own ON public.proposal_votes FOR SELECT TO authenticated USING (
  profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))
);
CREATE POLICY proposal_votes_insert_own ON public.proposal_votes FOR INSERT TO authenticated WITH CHECK (
  profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))
  AND EXISTS (SELECT 1 FROM public.proposals p WHERE p.thread_id = thread_id)
);
CREATE POLICY proposal_votes_delete_own ON public.proposal_votes FOR DELETE TO authenticated USING (
  profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))
);

GRANT SELECT ON public.categories, public.profiles, public.threads, public.posts, public.proposals, public.bug_reports, public.proposal_votes TO authenticated;
GRANT INSERT (auth_user_id, email, display_name, avatar_url, bio) ON public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_url, bio) ON public.profiles TO authenticated;
GRANT INSERT (category_id, author_id, type, title, slug) ON public.threads TO authenticated;
GRANT INSERT (thread_id, author_id, body) ON public.posts TO authenticated;
GRANT INSERT (thread_id) ON public.proposals TO authenticated;
GRANT INSERT (thread_id, version, platform) ON public.bug_reports TO authenticated;
GRANT INSERT (thread_id, profile_id) ON public.proposal_votes TO authenticated;
GRANT DELETE ON public.proposal_votes TO authenticated;

CREATE OR REPLACE VIEW public.community_public_posts WITH (security_barrier=true) AS
SELECT p.id, p.thread_id, p.body, p.is_first_post, p.edited_at, p.created_at,
       pr.display_name AS author, pr.avatar_url,
       EXISTS (SELECT 1 FROM public.official_responses r WHERE r.post_id = p.id) AS is_official
FROM public.posts p
JOIN public.profiles pr ON pr.id = p.author_id
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.community_public_threads AS
SELECT t.id, t.slug, t.title, t.type, t.pinned, t.locked,
       GREATEST((SELECT count(*) FROM public.posts px WHERE px.thread_id = t.id AND px.deleted_at IS NULL) - 1, 0)::integer AS reply_count,
       COALESCE((SELECT max(px.created_at) FROM public.posts px WHERE px.thread_id = t.id AND px.deleted_at IS NULL), t.created_at) AS last_post_at,
       p.display_name AS author, c.name AS category, c.slug AS category_slug
FROM public.threads t
JOIN public.profiles p ON p.id = t.author_id
JOIN public.categories c ON c.id = t.category_id
WHERE t.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.community_public_proposals AS
SELECT t.id, t.slug, t.title,
       GREATEST((SELECT count(*) FROM public.posts px WHERE px.thread_id = t.id AND px.deleted_at IS NULL) - 1, 0)::integer AS reply_count,
       COALESCE((SELECT max(px.created_at) FROM public.posts px WHERE px.thread_id = t.id AND px.deleted_at IS NULL), t.created_at) AS last_post_at,
       p.status, p.official_note,
       (SELECT count(*)::integer FROM public.proposal_votes pv WHERE pv.thread_id = t.id) AS vote_count,
       pr.display_name AS author
FROM public.threads t
JOIN public.proposals p ON p.thread_id = t.id
JOIN public.profiles pr ON pr.id = t.author_id
WHERE t.deleted_at IS NULL;

GRANT SELECT ON public.community_public_posts TO anonymous, authenticated;
GRANT SELECT ON public.community_public_categories, public.community_public_threads, public.community_public_proposals, public.community_public_activity, public.community_public_stats, public.community_public_roadmap TO authenticated;
