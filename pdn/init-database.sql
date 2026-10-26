-- Skema lengkap Portal Satu Data Buton Selatan untuk server PDN
-- Jalankan sekali pada database baru, setelah stack backend mandiri aktif.

-- ===== 20261001051711_8d5547be-b187-4cc7-a49a-07c2c61ec53c.sql =====
CREATE TYPE public.app_role AS ENUM ('admin','wali_data','produsen');
CREATE TYPE public.dataset_status AS ENUM ('draft','pending','published','rejected');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  acronym text,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.topics TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.user_org(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id
$$;

CREATE TABLE public.datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  format text NOT NULL DEFAULT 'CSV',
  license text NOT NULL DEFAULT 'CC-BY 4.0',
  frequency text DEFAULT 'Tahunan',
  tags text[] NOT NULL DEFAULT '{}',
  status public.dataset_status NOT NULL DEFAULT 'draft',
  review_note text,
  sample_data jsonb,
  file_url text,
  file_name text,
  downloads integer NOT NULL DEFAULT 0,
  views integer NOT NULL DEFAULT 0,
  created_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.datasets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.datasets TO authenticated;
GRANT ALL ON public.datasets TO service_role;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.portal_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  portal_name text NOT NULL DEFAULT 'Satu Data Buton Selatan',
  tagline text,
  contact_email text,
  contact_phone text,
  address text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portal_settings TO anon, authenticated;
GRANT UPDATE ON public.portal_settings TO authenticated;
GRANT ALL ON public.portal_settings TO service_role;
ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "org read" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "org admin write" ON public.organizations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "topic read" ON public.topics FOR SELECT USING (true);
CREATE POLICY "topic admin write" ON public.topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "profile self read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'wali_data'));
CREATE POLICY "profile self update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles admin insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles admin delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "settings read" ON public.portal_settings FOR SELECT USING (true);
CREATE POLICY "settings admin update" ON public.portal_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "public published" ON public.datasets FOR SELECT USING (status = 'published');
CREATE POLICY "curators read all" ON public.datasets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'wali_data'));
CREATE POLICY "producer read own org" ON public.datasets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'produsen') AND organization_id = public.user_org(auth.uid()));
CREATE POLICY "producer insert" ON public.datasets FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(),'produsen') AND organization_id = public.user_org(auth.uid()) AND status IN ('draft','pending'))
    OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "producer update" ON public.datasets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'produsen') AND organization_id = public.user_org(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'produsen') AND organization_id = public.user_org(auth.uid()));
CREATE POLICY "curator update" ON public.datasets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'wali_data'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'wali_data'));
CREATE POLICY "producer delete draft" ON public.datasets FOR DELETE TO authenticated
  USING ((public.has_role(auth.uid(),'produsen') AND organization_id = public.user_org(auth.uid()) AND status IN ('draft','rejected'))
    OR public.has_role(auth.uid(),'admin'));

-- Workflow guard
CREATE OR REPLACE FUNCTION public.dataset_workflow_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE curator boolean;
BEGIN
  curator := public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'wali_data') OR auth.uid() IS NULL;
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    IF NEW.status IN ('published','rejected') AND NOT curator THEN
      RAISE EXCEPTION 'Hanya Wali Data yang dapat menerbitkan atau menolak dataset';
    END IF;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('published','rejected') AND NOT curator THEN
      RAISE EXCEPTION 'Hanya Wali Data yang dapat menerbitkan atau menolak dataset';
    END IF;
    IF NOT curator AND OLD.status = 'published' THEN
      -- producer editing a published dataset sends it back to verification
      IF NEW.status = 'published' THEN NEW.status := 'pending'; END IF;
    END IF;
    IF NOT curator THEN NEW.review_note := CASE WHEN NEW.status = 'rejected' THEN OLD.review_note ELSE NEW.review_note END; END IF;
  END IF;
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status <> 'published') THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER datasets_guard BEFORE INSERT OR UPDATE ON public.datasets
  FOR EACH ROW EXECUTE FUNCTION public.dataset_workflow_guard();

CREATE OR REPLACE FUNCTION public.increment_dataset_stat(_id uuid, _kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _kind = 'download' THEN
    UPDATE public.datasets SET downloads = downloads + 1 WHERE id = _id AND status = 'published';
  ELSIF _kind = 'view' THEN
    UPDATE public.datasets SET views = views + 1 WHERE id = _id AND status = 'published';
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.increment_dataset_stat(uuid, text) TO anon, authenticated;

-- New user handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage
CREATE POLICY "dataset files staff upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dataset-files' AND (public.has_role(auth.uid(),'produsen') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'wali_data')));

-- Seed
INSERT INTO public.portal_settings (id, portal_name, tagline, contact_email, contact_phone, address)
VALUES (1, 'Satu Data Buton Selatan', 'Data terbuka untuk pembangunan Kabupaten Buton Selatan', 'satudata@butonselatankab.go.id', '(0402) 000000', 'Kompleks Perkantoran Pemda, Batauga, Buton Selatan, Sulawesi Tenggara');

INSERT INTO public.organizations (name, acronym, slug, description) VALUES
('Dinas Komunikasi dan Informatika','Diskominfo','diskominfo','Wali Data Kabupaten; pengelola Satu Data dan infrastruktur TIK.'),
('Badan Perencanaan Pembangunan Daerah','Bappeda','bappeda','Perencanaan, penelitian, dan pengembangan daerah.'),
('Dinas Kesehatan','Dinkes','dinkes','Layanan dan program kesehatan masyarakat.'),
('Dinas Pendidikan dan Kebudayaan','Dikbud','dikbud','Pendidikan dasar, PAUD, dan pelestarian budaya.'),
('Dinas Kelautan dan Perikanan','DKP','dkp','Perikanan tangkap, budidaya, dan pesisir.'),
('Dinas Pertanian','Distan','distan','Tanaman pangan, hortikultura, dan peternakan.'),
('Dinas Kependudukan dan Pencatatan Sipil','Disdukcapil','disdukcapil','Administrasi kependudukan.'),
('Dinas Pariwisata','Dispar','dispar','Destinasi, kunjungan, dan ekonomi kreatif.'),
('Dinas Sosial','Dinsos','dinsos','Perlindungan dan jaminan sosial.'),
('Badan Pengelolaan Keuangan dan Aset Daerah','BPKAD','bpkad','Pengelolaan APBD dan aset daerah.');

INSERT INTO public.topics (name, slug, description) VALUES
('Kependudukan','kependudukan','Jumlah, sebaran, dan struktur penduduk.'),
('Kesehatan','kesehatan','Fasilitas, tenaga, dan indikator kesehatan.'),
('Pendidikan','pendidikan','Sekolah, guru, dan partisipasi pendidikan.'),
('Kelautan & Perikanan','kelautan-perikanan','Produksi perikanan dan wilayah pesisir.'),
('Pertanian','pertanian','Produksi pangan, perkebunan, dan ternak.'),
('Pariwisata','pariwisata','Destinasi dan kunjungan wisatawan.'),
('Keuangan Daerah','keuangan-daerah','Pendapatan dan belanja daerah.'),
('Sosial','sosial','Kesejahteraan dan bantuan sosial.');

INSERT INTO public.datasets (title, slug, description, organization_id, topic_id, format, license, frequency, tags, status, sample_data, downloads, views)
SELECT d.title, d.slug, d.description, o.id, t.id, d.format, d.license, d.frequency, d.tags, 'published', d.sample::jsonb, d.dl, d.vw
FROM (VALUES
 ('Jumlah Penduduk per Kecamatan 2025','jumlah-penduduk-per-kecamatan-2025','Jumlah penduduk menurut jenis kelamin di 7 kecamatan Kabupaten Buton Selatan.','disdukcapil','kependudukan','CSV','CC-BY 4.0','Semesteran',ARRAY['penduduk','kecamatan'],
  '{"columns":["Kecamatan","Laki-laki","Perempuan","Total"],"rows":[["Batauga",9120,9384,18504],["Sampolawa",8210,8455,16665],["Lapandewa",3105,3240,6345],["Kadatua",4420,4598,9018],["Siompu",4010,4190,8200],["Siompu Barat",3390,3502,6892],["Batu Atas",2215,2290,4505]]}',412,1530),
 ('Fasilitas Kesehatan 2025','fasilitas-kesehatan-2025','Jumlah puskesmas, pustu, dan posyandu per kecamatan.','dinkes','kesehatan','XLSX','CC-BY 4.0','Tahunan',ARRAY['puskesmas','posyandu'],
  '{"columns":["Kecamatan","Puskesmas","Pustu","Posyandu"],"rows":[["Batauga",2,5,28],["Sampolawa",2,6,31],["Lapandewa",1,3,12],["Kadatua",1,4,15],["Siompu",1,3,14],["Siompu Barat",1,2,11],["Batu Atas",1,2,8]]}',238,880),
 ('Produksi Perikanan Tangkap 2020-2025','produksi-perikanan-tangkap','Volume produksi perikanan tangkap (ton) per tahun.','dkp','kelautan-perikanan','CSV','CC-BY 4.0','Tahunan',ARRAY['ikan','nelayan'],
  '{"columns":["Tahun","Produksi (ton)","Jumlah Nelayan"],"rows":[[2020,10240,5120],[2021,10980,5240],[2022,11520,5390],[2023,12105,5480],[2024,12870,5610],[2025,13440,5702]]}',356,1210),
 ('Jumlah Sekolah dan Guru 2025','jumlah-sekolah-dan-guru-2025','Jumlah satuan pendidikan dan guru menurut jenjang.','dikbud','pendidikan','CSV','CC-BY 4.0','Tahunan',ARRAY['sekolah','guru'],
  '{"columns":["Jenjang","Sekolah","Guru","Siswa"],"rows":[["PAUD",86,190,2840],["SD",112,1104,12350],["SMP",38,512,5620],["SMA/SMK",14,298,3410]]}',187,640),
 ('Produksi Tanaman Pangan 2024','produksi-tanaman-pangan-2024','Luas panen dan produksi jagung, ubi kayu, dan padi ladang.','distan','pertanian','XLSX','CC-BY-SA 4.0','Tahunan',ARRAY['jagung','pangan'],
  '{"columns":["Komoditas","Luas Panen (ha)","Produksi (ton)"],"rows":[["Jagung",4210,15890],["Ubi Kayu",1820,27300],["Padi Ladang",380,1140],["Kacang Tanah",260,390]]}',142,505),
 ('Kunjungan Wisatawan 2025','kunjungan-wisatawan-2025','Jumlah kunjungan wisatawan per bulan ke destinasi utama.','dispar','pariwisata','CSV','CC-BY 4.0','Bulanan',ARRAY['wisata','kunjungan'],
  '{"columns":["Bulan","Nusantara","Mancanegara"],"rows":[["Jan",2100,45],["Feb",1850,38],["Mar",2400,52],["Apr",2950,61],["Mei",3200,88],["Jun",4100,120]]}',98,420),
 ('Realisasi APBD 2024','realisasi-apbd-2024','Ringkasan realisasi pendapatan dan belanja daerah.','bpkad','keuangan-daerah','PDF','Open Government License','Tahunan',ARRAY['apbd','anggaran'],
  '{"columns":["Uraian","Anggaran (Rp juta)","Realisasi (Rp juta)"],"rows":[["Pendapatan Daerah",812400,790150],["Belanja Operasi",560200,531880],["Belanja Modal",168300,149720],["Belanja Tidak Terduga",5000,1250]]}',265,970),
 ('Penerima Bantuan Sosial 2025','penerima-bantuan-sosial-2025','Jumlah keluarga penerima manfaat menurut program.','dinsos','sosial','CSV','CC-BY 4.0','Semesteran',ARRAY['bansos','pkh'],
  '{"columns":["Program","Keluarga Penerima"],"rows":[["PKH",6420],["BPNT",8115],["BLT Desa",3020],["PBI JK",21450]]}',120,455)
) AS d(title, slug, description, org, topic, format, license, frequency, tags, sample, dl, vw)
JOIN public.organizations o ON o.slug = d.org
JOIN public.topics t ON t.slug = d.topic;
-- ===== 20261001051724_22876a6a-bb90-4944-8865-ec6040f5e0b8.sql =====
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dataset_workflow_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_org(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_org(uuid) TO authenticated;
CREATE POLICY "dataset files read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'dataset-files');
-- ===== 20261001172236_c55a0447-fad6-4f80-b8ff-5824628de284.sql =====
alter table public.portal_settings
  add column if not exists bupati_photo_url text,
  add column if not exists wabup_photo_url text;
-- ===== 20261001172249_e98a083e-ebe2-4352-84b5-ce03d68299d0.sql =====
CREATE POLICY "portal assets read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'portal-assets');
CREATE POLICY "portal assets admin write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portal-assets' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "portal assets admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'portal-assets' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "portal assets admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'portal-assets' AND public.has_role(auth.uid(),'admin'));
-- ===== 20261001231106_3b76939a-b726-458e-a466-86bf3beab761.sql =====
alter table public.portal_settings
  add column if not exists logo_url text,
  add column if not exists region_label text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists youtube_url text,
  add column if not exists bupati_name text,
  add column if not exists bupati_title text,
  add column if not exists wabup_name text,
  add column if not exists wabup_title text,
  add column if not exists welcome_title text,
  add column if not exists welcome_body text,
  add column if not exists hero_kicker text,
  add column if not exists hero_title text,
  add column if not exists hero_description text;
-- ===== 0000_license_access_and_data_requests.sql =====
DROP POLICY IF EXISTS "dataset files read" ON storage.objects;
CREATE POLICY "dataset files staff read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'dataset-files' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'wali_data') OR public.has_role(auth.uid(),'produsen')));
CREATE POLICY "dataset files public open read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'dataset-files' AND EXISTS (SELECT 1 FROM public.datasets d WHERE d.file_url = storage.objects.name AND d.status = 'published' AND d.license <> 'Terbatas'));

CREATE TABLE public.data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (length(email) BETWEEN 5 AND 200),
  institution text CHECK (length(institution) <= 200),
  purpose text NOT NULL CHECK (length(purpose) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.data_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_requests TO authenticated;
GRANT ALL ON public.data_requests TO service_role;
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public submit request" ON public.data_requests FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending' AND reviewed_by IS NULL AND EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_id AND d.status = 'published'));
CREATE POLICY "curators read requests" ON public.data_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'wali_data'));
CREATE POLICY "curators update requests" ON public.data_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'wali_data'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'wali_data'));
CREATE POLICY "curators delete requests" ON public.data_requests FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'wali_data'));
-- ===== 0001_notifications_history.sql =====
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
-- ===== 0002_system_features.sql =====
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