alter table public.portal_settings
  add column if not exists bupati_photo_url text,
  add column if not exists wabup_photo_url text;