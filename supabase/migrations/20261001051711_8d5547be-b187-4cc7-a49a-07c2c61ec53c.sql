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