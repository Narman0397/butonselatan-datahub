ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS change_note text;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notif select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notif update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own notif delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX ON public.notifications (user_id, created_at DESC);

CREATE TABLE public.dataset_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_name text,
  org_name text,
  action text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dataset_history TO anon, authenticated;
GRANT ALL ON public.dataset_history TO service_role;
ALTER TABLE public.dataset_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history visible with dataset" ON public.dataset_history FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_id));
CREATE INDEX ON public.dataset_history (dataset_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_staff(_title text, _msg text, _link text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT DISTINCT user_id, _title, _msg, _link FROM public.user_roles
  WHERE role IN ('wali_data','admin') AND user_id IS DISTINCT FROM auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.notify_staff(text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dataset_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _action text;
  _actor text;
  _org text;
BEGIN
  SELECT full_name INTO _actor FROM public.profiles WHERE id = auth.uid();
  SELECT name INTO _org FROM public.organizations WHERE id = NEW.organization_id;
  IF TG_OP = 'INSERT' THEN
    _action := CASE WHEN NEW.status = 'pending' THEN 'Dibuat & diajukan' ELSE 'Dibuat' END;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    _action := CASE NEW.status WHEN 'pending' THEN 'Diajukan untuk verifikasi' WHEN 'published' THEN 'Diterbitkan' WHEN 'rejected' THEN 'Ditolak' ELSE 'Dikembalikan ke draft' END;
  ELSIF NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.file_url IS DISTINCT FROM OLD.file_url OR NEW.sample_data IS DISTINCT FROM OLD.sample_data
     OR NEW.license IS DISTINCT FROM OLD.license OR NEW.change_note IS DISTINCT FROM OLD.change_note THEN
    _action := CASE WHEN NEW.file_url IS DISTINCT FROM OLD.file_url THEN 'Berkas data diperbarui' ELSE 'Metadata diperbarui' END;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.dataset_history (dataset_id, actor_id, actor_name, org_name, action, note)
  VALUES (NEW.id, auth.uid(), _actor, _org, _action,
    CASE WHEN NEW.status = 'rejected' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'rejected') THEN NEW.review_note
         WHEN TG_OP = 'INSERT' OR NEW.change_note IS DISTINCT FROM OLD.change_note THEN NEW.change_note ELSE NULL END);

  IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending') THEN
    PERFORM public.notify_staff('Pengajuan dataset baru', COALESCE(_org,'OPD') || ': ' || NEW.title, '/dashboard/verifikasi');
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IN ('published','rejected') AND OLD.status IS DISTINCT FROM NEW.status AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, link) VALUES (
      NEW.created_by,
      CASE WHEN NEW.status = 'published' THEN 'Dataset diterbitkan' ELSE 'Dataset ditolak' END,
      NEW.title || CASE WHEN NEW.status = 'rejected' AND NEW.review_note IS NOT NULL THEN ' — Catatan: ' || NEW.review_note ELSE '' END,
      '/dashboard/dataset');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER datasets_audit AFTER INSERT OR UPDATE ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.dataset_audit();

CREATE OR REPLACE FUNCTION public.data_request_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t text;
BEGIN
  SELECT title INTO _t FROM public.datasets WHERE id = NEW.dataset_id;
  PERFORM public.notify_staff('Permohonan data baru', NEW.name || ' meminta akses: ' || COALESCE(_t,'dataset'), '/dashboard/permohonan');
  RETURN NEW;
END $$;
CREATE TRIGGER data_requests_notify AFTER INSERT ON public.data_requests FOR EACH ROW EXECUTE FUNCTION public.data_request_notify();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;