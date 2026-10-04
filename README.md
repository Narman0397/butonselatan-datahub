# Buton Selatan Data Hub

Bangun portal Satu Data Kabupaten Buton Selatan sebagai aplikasi web modern kustom lengkap dengan sistem RBAC:

1. Portal Publik:
- Beranda dengan pencarian dataset terpadu, statistik data terbuka, visualisasi grafik data, dan daftar instansi/OPD Kabupaten Buton Selatan
- Katalog dataset dengan pencarian, filter berdasarkan OPD/instansi, format file (CSV, XLSX, PDF), topik sektoral, dan status lisensi
- Halaman detail dataset dengan metadata lengkap, pratinjau tabel data sampel interaktif, dan tombol download
- Direktori Organisasi/OPD dan Kategori/Topik data Buton Selatan

2. Sistem RBAC (Role-Based Access Control) & Autentikasi:
- Publik / Guest: Menjelajah, memfilter, melihat preview, dan mengunduh dataset publik
- Produsen Data (Operator OPD): Dashboard untuk mengunggah dataset, memperbarui resource data, dan mengelola draft dataset milik instansinya
- Wali Data (Diskominfo): Dashboard kurasi dan verifikasi untuk meninjau dataset yang diajukan OPD sebelum dipublikasikan ke publik
- Super Admin: Manajemen pengguna, penetapan peran (role assignment), manajemen OPD/organisasi, dan pengaturan portal

3. Dashboard Manajemen Data:
- Alur kerja status dataset (Draft -> Menunggu Verifikasi -> Diterbitkan / Ditolak dengan catatan)
- Tampilan tabel manajemen data yang responsif, modern, dan mudah digunakan

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://butonselatan-datahub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9e98ea97-c3ea-4536-bdc5-847e1058832f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
