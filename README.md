# Portal Satu Data Kabupaten Buton Selatan

Portal data terbuka resmi Pemerintah Kabupaten Buton Selatan, dikelola oleh Dinas Komunikasi dan Informatika.

## Fitur
- Portal publik: beranda, katalog dataset, detail & pratinjau data, direktori OPD dan topik.
- Peran: Publik, Produsen Data (OPD), Wali Data (Diskominfo), Super Admin.
- Alur dataset: Draft → Menunggu Verifikasi → Diterbitkan / Ditolak.
- Sifat data Terbuka/Terbatas dengan permohonan data, notifikasi, riwayat, dan laporan.

## Kebutuhan
- Node.js 20+ dan npm
- Backend database, autentikasi, dan penyimpanan file yang telah dimigrasikan (lihat folder `supabase/migrations`).

## Instalasi
```sh
cp .env.example .env   # isi dengan alamat dan kunci publik backend resmi
npm install
npm run build
npm run preview        # atau jalankan hasil build melalui PM2/Nginx
```

## Pengembangan lokal
```sh
npm install
npm run dev
```

© Pemerintah Kabupaten Buton Selatan — Dinas Komunikasi dan Informatika.
