# Portal Satu Data Kabupaten Buton Selatan

Portal data terbuka resmi Pemerintah Kabupaten Buton Selatan, dikelola oleh Dinas Komunikasi dan Informatika.

## Fitur
- Portal publik: beranda, katalog dataset, detail & pratinjau data, direktori OPD dan topik.
- Peran: Publik, Produsen Data (OPD), Wali Data (Diskominfo), Super Admin.
- Alur dataset: Draft → Menunggu Verifikasi → Diterbitkan / Ditolak.
- Sifat data Terbuka/Terbatas dengan permohonan data, notifikasi, riwayat, dan laporan.

## Kebutuhan Server PDN
- Ubuntu 22.04/24.04, Node.js 20+, npm, PM2, Nginx
- Docker Engine + Docker Compose (backend mandiri: PostgreSQL, autentikasi, penyimpanan berkas, API)
- Minimal 4 vCPU, 8 GB RAM, 50 GB disk
- Dua subdomain: portal (mis. `data.butonselatankab.go.id`) dan API (mis. `api-data.butonselatankab.go.id`)

## Instalasi di Server PDN
```sh
# 1. Paket sistem
sudo apt update && sudo apt install -y nginx git openssl ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER && newgrp docker
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm install -g pm2

# 2. Backend mandiri di PDN (database, login OPD, penyimpanan berkas)
#    Otomatis: membuat kunci rahasia, menjalankan container, memasang
#    seluruh tabel/aturan akses (pdn/init-database.sql), dan menulis .env aplikasi.
DOMAIN_API=https://api-data.butonselatankab.go.id \
DOMAIN_PORTAL=https://data.butonselatankab.go.id \
bash pdn/pasang-backend.sh

# 3. Siapkan kode untuk build mandiri
cp package.pdn.json package.json
cp vite.config.pdn.ts vite.config.ts
rm -f bun.lock bunfig.toml

# 4. Dependensi & build
npm install
npm run build

# 5. Jalankan aplikasi
PORT=3000 pm2 start .output/server/index.mjs --name satudata
pm2 save && pm2 startup
```

## Nginx & HTTPS
```sh
sudo cp pdn/nginx-satudata.conf /etc/nginx/sites-available/satudata
sudo ln -s /etc/nginx/sites-available/satudata /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d data.butonselatankab.go.id -d api-data.butonselatankab.go.id
```
Sesuaikan nama domain di `pdn/nginx-satudata.conf` bila berbeda.

## Akun Super Admin pertama
1. Daftar melalui halaman `/auth` di portal.
2. Jadikan Super Admin:
```sh
cd /opt/satudata-backend
docker compose exec db psql -U postgres -c \
 "insert into public.user_roles(user_id, role) select id, 'super_admin' from auth.users where email='admin@butonselatankab.go.id' on conflict do nothing;"
```

## Email (lupa sandi & konfirmasi akun)
Isi `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL` pada `/opt/satudata-backend/.env`, lalu `docker compose up -d`.

## Cadangan data
```sh
cd /opt/satudata-backend
docker compose exec -T db pg_dump -U postgres postgres > cadangan-$(date +%F).sql
tar czf berkas-$(date +%F).tgz volumes/storage
```
Port 5432 dan 8000 jangan dibuka ke internet; akses hanya melalui Nginx.

## Pengembangan lokal
```sh
npm install
npm run dev
```

© Pemerintah Kabupaten Buton Selatan — Dinas Komunikasi dan Informatika.
