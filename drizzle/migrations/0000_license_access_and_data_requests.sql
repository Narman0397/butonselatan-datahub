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