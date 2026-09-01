import packageJson from '../../../package.json' with { type: 'json' }

export const selfHostingReleaseTag = `v${packageJson.version}`

export const selfHostingDeployCommand = `git clone --branch ${selfHostingReleaseTag} --depth 1 https://github.com/lord007tn/keenpix.git
cd keenpix
cp .env.example .env
# keep every service on the release you just checked out:
echo 'KEENPIX_APP_IMAGE=ghcr.io/lord007tn/keenpix-app:${selfHostingReleaseTag}' >> .env
echo 'KEENPIX_TRANSFORM_IMAGE=ghcr.io/lord007tn/keenpix-transform:${selfHostingReleaseTag}' >> .env
echo 'KEENPIX_WORKER_IMAGE=ghcr.io/lord007tn/keenpix-worker:${selfHostingReleaseTag}' >> .env
echo 'KEENPIX_DOCS_IMAGE=ghcr.io/lord007tn/keenpix-docs:${selfHostingReleaseTag}' >> .env
# set a strong secret:
#   BETTER_AUTH_SECRET=$(openssl rand -hex 32)
# set POSTGRES_PASSWORD, KEENPIX_SUPER_ADMIN_EMAIL, and KEENPIX_SUPER_ADMIN_PASSWORD
docker compose pull
docker compose up -d
# dashboard → http://localhost:3000
# docs      → http://localhost:3003`
