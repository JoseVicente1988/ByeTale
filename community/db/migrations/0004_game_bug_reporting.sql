CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.game_bug_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), access_token_hash text NOT NULL UNIQUE,
  installation_hash text NOT NULL, error_code text NOT NULL, error_message text NOT NULL,
  game_version text NOT NULL, platform text, scene text, stack_trace text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'), claimed_at timestamptz,
  claimed_thread_id uuid REFERENCES public.threads(id) ON DELETE SET NULL,
  CHECK (length(error_code) BETWEEN 1 AND 64), CHECK (length(error_message) BETWEEN 1 AND 1000),
  CHECK (length(game_version) BETWEEN 1 AND 40), CHECK (platform IS NULL OR length(platform) <= 80),
  CHECK (scene IS NULL OR length(scene) <= 160), CHECK (stack_trace IS NULL OR length(stack_trace) <= 6000),
  CHECK (jsonb_typeof(metadata) = 'object'), CHECK (expires_at > created_at)
);
CREATE INDEX game_bug_intake_rate_idx ON public.game_bug_intake (installation_hash, created_at DESC);
CREATE INDEX game_bug_intake_expiry_idx ON public.game_bug_intake (expires_at) WHERE claimed_at IS NULL;
ALTER TABLE public.game_bug_intake ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_bug_intake FROM PUBLIC, anonymous, authenticated;
ALTER TABLE public.bug_reports ADD COLUMN source_report_id uuid UNIQUE REFERENCES public.game_bug_intake(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.create_bug_thread(p_title text,p_slug text,p_body text,p_image_url text DEFAULT NULL,
  p_version text DEFAULT NULL,p_platform text DEFAULT NULL,p_report_id uuid DEFAULT NULL,p_report_token text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_uid text; v_profile uuid; v_category uuid; v_thread uuid; v_intake uuid;
BEGIN
  v_uid := current_setting('request.jwt.claims',true)::jsonb->>'sub';
  IF coalesce(v_uid,'')='' THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  SELECT id INTO v_profile FROM public.profiles WHERE auth_user_id=v_uid;
  IF v_profile IS NULL THEN RAISE EXCEPTION 'profile required' USING ERRCODE='23503'; END IF;
  IF (p_report_id IS NULL)<>(p_report_token IS NULL) THEN RAISE EXCEPTION 'report credentials incomplete' USING ERRCODE='22023'; END IF;
  IF p_report_id IS NOT NULL THEN
    SELECT id INTO v_intake FROM public.game_bug_intake WHERE id=p_report_id
      AND access_token_hash=encode(digest(p_report_token,'sha256'),'hex') AND expires_at>now() AND claimed_at IS NULL FOR UPDATE;
    IF v_intake IS NULL THEN RAISE EXCEPTION 'invalid, expired or claimed report' USING ERRCODE='22023'; END IF;
  END IF;
  SELECT id INTO v_category FROM public.categories WHERE slug='bugs' AND is_read_only=false;
  INSERT INTO public.threads(category_id,author_id,type,title,slug) VALUES(v_category,v_profile,'bug'::thread_type,p_title,p_slug) RETURNING id INTO v_thread;
  INSERT INTO public.posts(thread_id,author_id,body,image_url) VALUES(v_thread,v_profile,p_body,p_image_url);
  INSERT INTO public.bug_reports(thread_id,version,platform,source_report_id) VALUES(v_thread,nullif(p_version,''),nullif(p_platform,''),v_intake);
  IF v_intake IS NOT NULL THEN UPDATE public.game_bug_intake SET claimed_at=now(),claimed_thread_id=v_thread WHERE id=v_intake; END IF;
  RETURN v_thread;
END $$;
REVOKE ALL ON FUNCTION public.create_bug_thread(text,text,text,text,text,text,uuid,text) FROM PUBLIC,anonymous;
GRANT EXECUTE ON FUNCTION public.create_bug_thread(text,text,text,text,text,text,uuid,text) TO authenticated;
