# HunianID

Housing / residence management app. Laravel + Inertia.js + React (Laravel's official React starter kit: Fortify auth, shadcn/ui, Wayfinder), backed by a shared MySQL database. Runs locally through Docker.

## Stack

- **Backend:** Laravel 13 (PHP 8.4), Laravel Fortify (auth), Laravel Wayfinder (typed routes)
- **Frontend:** React 19 + TypeScript via Inertia.js, shadcn/ui + radix-ui, Tailwind CSS v4
- **Database:** MySQL, hosted centrally
- **PWA:** vite-plugin-pwa
- **Local infra:** Docker (nginx + PHP-FPM)

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Compose v2)
- [Node.js](https://nodejs.org/) 20+ and npm (used to run Vite locally — not containerized, so HMR is fast)

You do **not** need PHP or Composer installed on your host; both run inside the `app` container.

## Setup

1. **Clone the repo**

   ```bash
   git clone <repo-url> hunianid
   cd hunianid
   ```

2. **Copy the environment file**

   ```bash
   cp .env.example .env
   ```

3. **Build and start the containers**

   ```bash
   docker compose up -d --build
   ```

   This starts nginx + PHP-FPM at http://localhost:8000.

4. **Install PHP dependencies and generate the app key** (first run only)

   ```bash
   docker compose exec app composer install
   docker compose exec app php artisan key:generate
   ```

5. **Run migrations** (only needed if the shared schema hasn't been created yet — check with the team first, since everyone shares the same database)

   ```bash
   docker compose exec app php artisan migrate
   ```

6. **Install JS dependencies and start Vite**

   ```bash
   npm install
   npm run dev
   ```

   Keep this running in a separate terminal — Vite serves the React/Inertia assets with hot reload while nginx/PHP-FPM serve the app itself.

7. **Visit the app**

   Open http://localhost:8000 — you should see the landing page, and http://localhost:8000/login for the Fortify-powered login page.

## Everyday commands

```bash
# Run artisan commands
docker compose exec app php artisan <command>

# Tail logs
docker compose logs -f app

# Stop everything
docker compose down
```

## Linting & formatting

```bash
# PHP (Laravel Pint)
docker compose exec app ./vendor/bin/pint        # fix
docker compose exec app ./vendor/bin/pint --test # check only

# JS/TS (ESLint + Prettier)
npm run lint          # eslint --fix
npm run lint:check    # eslint, no fix
npm run format        # prettier --write
npm run format:check  # prettier --check
npm run types:check   # tsc --noEmit
```

## Building for production

```bash
npm run build
```

This generates hashed assets in `public/build/`, plus the PWA service worker (`public/sw.js`) and manifest (`public/build/manifest.webmanifest`) needed for "Add to Home Screen" support.
