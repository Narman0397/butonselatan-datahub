#!/usr/bin/env bash
# Pemasangan backend mandiri Portal Satu Data Buton Selatan di server PDN (Ubuntu + Docker)
set -euo pipefail

DOMAIN_API="${DOMAIN_API:?Isi DOMAIN_API, contoh: https://api-data.butonselatankab.go.id}"
DOMAIN_PORTAL="${DOMAIN_PORTAL:?Isi DOMAIN_PORTAL, contoh: https://data.butonselatankab.go.id}"
DIR_BACKEND="${DIR_BACKEND:-/opt/satudata-backend}"
DIR_APP="$(cd "$(dirname "$0")/.." && pwd)"

command -v docker >/dev/null || { echo "Docker belum terpasang"; exit 1; }
command -v node >/dev/null || { echo "Node.js 20+ belum terpasang"; exit 1; }

if [ ! -d "$DIR_BACKEND" ]; then
  git clone --depth 1 https://github.com/supabase/supabase /tmp/stack-sumber
  sudo mkdir -p "$DIR_BACKEND"
  sudo cp -r /tmp/stack-sumber/docker/. "$DIR_BACKEND/"
  sudo chown -R "$USER" "$DIR_BACKEND"
  rm -rf /tmp/stack-sumber
fi
cd "$DIR_BACKEND"
[ -f .env ] || cp .env.example .env

acak() { openssl rand -hex "$1"; }
JWT_SECRET="$(acak 32)"
read -r ANON_KEY SERVICE_KEY < <(JWT_SECRET="$JWT_SECRET" node -e '
const c=require("crypto");const s=process.env.JWT_SECRET;
const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
const t=r=>{const h=b({alg:"HS256",typ:"JWT"}),now=Math.floor(Date.now()/1e3);
const p=b({role:r,iss:"satudata",iat:now,exp:now+60*60*24*365*10});
return h+"."+p+"."+c.createHmac("sha256",s).update(h+"."+p).digest("base64url")};
console.log(t("anon"),t("service_role"))')

atur() { if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi; }
atur POSTGRES_PASSWORD "$(acak 24)"
atur JWT_SECRET "$JWT_SECRET"
atur ANON_KEY "$ANON_KEY"
atur SERVICE_ROLE_KEY "$SERVICE_KEY"
atur DASHBOARD_PASSWORD "$(acak 16)"
atur SECRET_KEY_BASE "$(acak 32)"
atur VAULT_ENC_KEY "$(acak 16)"
atur API_EXTERNAL_URL "$DOMAIN_API"
atur SUPABASE_PUBLIC_URL "$DOMAIN_API"
atur SITE_URL "$DOMAIN_PORTAL"
atur ADDITIONAL_REDIRECT_URLS "$DOMAIN_PORTAL/reset-password"
atur ENABLE_ANONYMOUS_USERS false
chmod 600 .env

docker compose pull
docker compose up -d

echo "Menunggu database siap..."
until docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1; do sleep 3; done
sleep 15
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$DIR_APP/pdn/init-database.sql"

cat > "$DIR_APP/.env" <<ENV
VITE_SUPABASE_URL="$DOMAIN_API"
VITE_SUPABASE_PUBLISHABLE_KEY="$ANON_KEY"
VITE_SUPABASE_PROJECT_ID="satudata-pdn"
SUPABASE_URL="$DOMAIN_API"
SUPABASE_PUBLISHABLE_KEY="$ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY"
ENV
chmod 600 "$DIR_APP/.env"

echo "Backend aktif. Kredensial tersimpan di $DIR_BACKEND/.env (jangan dibagikan)."
echo "Lanjutkan build aplikasi sesuai README.md."
