import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    server: {
        watch: {
            // Laravel writes to storage/ on every single request — session files (when
            // using the `file` session driver) and, notably, a fresh JSON snapshot per
            // request from Inertia's devtools feature (storage/inertia-devtools/*.json).
            // Vite's watcher was picking those up as "source changed" and firing a full
            // page reload on every request — which is what looked like the app randomly
            // reloading mid-navigation throughout this whole debugging session. None of
            // storage/ is a frontend source file, so it never needs to be watched at all.
            ignored: ['**/storage/**'],
        },
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
                bunny('Sora', {
                    weights: [600, 700, 800],
                }),
                bunny('IBM Plex Mono', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
            command: 'docker compose exec -T app php artisan wayfinder:generate',
        }),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: false,
            // No explicit outDir — inherit Vite's actual build.outDir (laravel-vite-plugin
            // resolves that to `public/build`), matching the <link rel="manifest"
            // href="/build/manifest.webmanifest"> reference in resources/views/app.blade.php.
            // The previous `outDir: 'public'` wrote the manifest to `public/manifest.webmanifest`
            // instead, which is why it always 404'd — even after a production build.
            base: '/',
            includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
            manifest: {
                name: 'HunianID',
                short_name: 'HunianID',
                description: 'Housing / residence management app',
                theme_color: '#142033',
                background_color: '#142033',
                display: 'standalone',
                start_url: '/',
                scope: '/',
                icons: [
                    {
                        src: '/icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
            },
        }),
    ],
});
