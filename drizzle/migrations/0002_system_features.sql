CREATE TABLE public.system_features (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_features TO anon, authenticated;
GRANT UPDATE ON public.system_features TO authenticated;
GRANT ALL ON public.system_features TO service_role;
ALTER TABLE public.system_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "features readable" ON public.system_features FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin updates features" ON public.system_features FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.system_features (key, label, description, sort_order) VALUES
('notifications','Notifikasi Interaktif','Lonceng notifikasi dashboard dan pembuatan notifikasi otomatis.',1),
('audit_history','Riwayat Dataset','Linimasa riwayat perubahan dataset dan pencatatan audit.',2),
('data_requests','Permohonan Data','Formulir permohonan dataset Terbatas dan menu peninjauan Wali Data.',3),
('reports','Laporan Statistik','Menu laporan dan ekspor Excel/PDF.',4),
('user_management','Manajemen Pengguna','Menu Pengguna & Peran, tambah akun, dan penetapan peran.',5),
('org_management','Manajemen OPD & Topik','Menu OPD & Topik beserta perubahan datanya.',6),
('portal_settings','Pengaturan Portal','Menu pengaturan branding, pimpinan, dan beranda.',7),
('leadership_section','Sambutan Pimpinan','Seksi sambutan Bupati/Wakil Bupati di beranda.',8),
('citation','Sitasi Dataset','Kotak sitasi dan tombol salin sitasi di detail dataset.',9);

CREATE OR REPLACE FUNCTION public.feature_enabled(_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT enabled FROM public.system_features WHERE key = _key), true)
$$;

CREATE OR REPLACE FUNCTION public.feature_skip_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.feature_enabled(TG_ARGV[0]) THEN RETURN NULL; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.feature_block_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.feature_enabled(TG_ARGV[0]) THEN
    RAISE EXCEPTION 'Fitur sedang dinonaktifkan';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.feature_skip_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.feature_block_write() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER gate_notifications BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.feature_skip_insert('notifications');
CREATE TRIGGER gate_history BEFORE INSERT ON public.dataset_history FOR EACH ROW EXECUTE FUNCTION public.feature_skip_insert('audit_history');
CREATE TRIGGER gate_data_requests BEFORE INSERT OR UPDATE ON public.data_requests FOR EACH ROW EXECUTE FUNCTION public.feature_block_write('data_requests');
CREATE TRIGGER gate_user_roles BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.feature_block_write('user_management');
CREATE TRIGGER gate_organizations BEFORE INSERT OR UPDATE OR DELETE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.feature_block_write('org_management');
CREATE TRIGGER gate_topics BEFORE INSERT OR UPDATE OR DELETE ON public.topics FOR EACH ROW EXECUTE FUNCTION public.feature_block_write('org_management');
CREATE TRIGGER gate_portal_settings BEFORE UPDATE ON public.portal_settings FOR EACH ROW EXECUTE FUNCTION public.feature_block_write('portal_settings');