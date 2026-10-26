# Portal Satu Data Kabupaten Buton Selatan

Portal data terbuka resmi Pemerintah Kabupaten Buton Selatan, dikelola oleh Dinas Komunikasi dan Informatika.

## Fitur
- Portal publik: beranda, katalog dataset, detail & pratinjau data, direktori OPD dan topik.
- Peran: Publik, Produsen Data (OPD), Wali Data (Diskominfo), Super Admin.
- Alur dataset: Draft → Menunggu Verifikasi → Diterbitkan / Ditolak.
- Sifat data Terbuka/Terbatas dengan permohonan data, notifikasi, riwayat, dan laporan.

## Kebutuhan Server PDN
- Ubuntu 22.04/24.04, Node.js 20+, npm, PM2, Nginx
- Backend PostgreSQL + layanan autentikasi + penyimpanan berkas (bucket privat `dataset-files` dan `portal-assets`)

## Instalasi di Server PDN
```sh
# 1. Paket sistem
sudo apt update && sudo apt install -y nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm install -g pm2

# 2. Siapkan kode untuk build mandiri
cp package.pdn.json package.json
cp vite.config.pdn.ts vite.config.ts
rm -f bun.lock bunfig.toml

# 3. Variabel lingkungan
cp .env.example .env      # isi alamat & kunci publik backend resmi
export DATABASE_URL="postgresql://user:sandi@host:5432/satudata"

# 4. Dependensi, migrasi basis data, build
npm install
npx drizzle-kit migrate   # atau jalankan berkas SQL di supabase/migrations secara berurutan
npm run build

# 5. Jalankan aplikasi
pm2 start .output/server/index.mjs --name satudata
pm2 save && pm2 startup
```

## Nginx & HTTPS
```nginx
server {
  server_name satudata.butonselatankab.go.id;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
```sh
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d satudata.butonselatankab.go.id
```

## Pengembangan lokal
```sh
npm install
npm run dev
```

© Pemerintah Kabupaten Buton Selatan — Dinas Komunikasi dan Informatika.
