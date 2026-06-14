#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

WP_URL="${WP_URL:-http://localhost:${AWEN_WP_PORT:-8091}}"
ADMIN_USER="${ADMIN_USER:-${AWEN_ADMIN_USER:-awenadmin}}"
ADMIN_PASS="${ADMIN_PASS:-${AWEN_ADMIN_PASSWORD:-change-me-admin}}"
ADMIN_EMAIL="${ADMIN_EMAIL:-${AWEN_ADMIN_EMAIL:-admin@awen01.cc}}"
PLUGIN_DIR="/var/www/project/wordpress-site-plugins-themes/pluginswewanttouse"

wpcli() {
  docker compose run --rm wpcli "$@"
}

echo "Starting AWEN01 WordPress containers..."
docker compose up -d db wordpress

echo "Waiting for WordPress core..."
for attempt in {1..40}; do
  if wpcli wp core version >/dev/null 2>&1; then
    break
  fi
  sleep 3
  if [[ "$attempt" == "40" ]]; then
    echo "WordPress core did not become ready in time." >&2
    exit 1
  fi
done

if ! wpcli wp core is-installed >/dev/null 2>&1; then
  wpcli wp core install \
    --url="$WP_URL" \
    --title="AWEN01" \
    --admin_user="$ADMIN_USER" \
    --admin_password="$ADMIN_PASS" \
    --admin_email="$ADMIN_EMAIL" \
    --skip-email
else
  echo "WordPress already installed."
fi

echo "Installing GeneratePress theme and GenerateBlocks base plugin..."
wpcli wp theme install generatepress
wpcli wp theme activate awen01-generatepress-child
wpcli wp plugin install generateblocks --activate

echo "Installing local plugin bundle..."
for zip in \
  advanced-custom-fields.zip \
  gp-premium-2.5.6.zip \
  generateblocks-pro-2.5.0.zip \
  brand-standards-creator.zip \
  gx-scroll-motion.zip \
  taxonomy-query.zip \
  GX-PixelPusher.zip
do
  wpcli wp plugin install "$PLUGIN_DIR/$zip" --force --activate || {
    echo "Plugin install failed for $zip" >&2
    exit 1
  }
done

echo "Installing UltraBGs background plugin from plugins-to-sell..."
rm -rf wp-content/plugins/ultrabgs
cp -R plugins-to-sell/ultrabgs/ultrabgs wp-content/plugins/ultrabgs
wpcli wp plugin activate ultrabgs
rm -rf wp-content/plugins/ubgs-awen01
cp -R plugins-to-sell/ultrabgs/ubgs-awen01 wp-content/plugins/ubgs-awen01
wpcli wp plugin activate ubgs-awen01

echo "Activating AWEN01 dark/light/transcendent color-mode plugin..."
wpcli wp plugin activate awen01-dark-light-transcendent

echo "Storing premium license keys locally when present..."
GP_KEY="$(grep -E '^(GENERATE_PRESS_BLOCKS_API_KEY|GENERATE-PRESS-BLOCKS_API_KEY)=' .env 2>/dev/null | tail -1 | sed 's/^[^=]*=//' || true)"
if [[ -n "$GP_KEY" ]]; then
  wpcli wp option update gen_premium_license_key "$GP_KEY" >/dev/null
  wpcli wp option update generateblocks_pro_licensing "{\"key\":\"$GP_KEY\",\"status\":\"inactive\",\"beta\":false}" --format=json >/dev/null || true
fi

echo "Seeding AWEN01 brand standards and pages..."
wpcli wp eval-file /var/www/project/scripts/seed-awen01-brand.php \
  /var/www/project/brand/awen01-brand.json \
  /var/www/project/brand/home.html \
  /var/www/project/logo.png

echo
echo "AWEN01 local WordPress is ready:"
echo "Site:  $WP_URL"
echo "Admin: $WP_URL/wp-admin/"
echo "User:  $ADMIN_USER"
echo "Pass:  $ADMIN_PASS"
