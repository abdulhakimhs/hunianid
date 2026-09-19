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
            command:
                process.env.WAYFINDER_COMMAND ||
                'docker compose exec -T app php artisan wayfinder:generate',
        }),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: false,
            workbox: {
                globPatterns: ['**/*.{js,css,ico,png,svg}'],
                navigateFallback: null,
                runtimeCaching: [/* unchanged */],
            },
            devOptions: { enabled: true },
            // Chrome/Android only offers the "Add to Home Screen" prompt when the
            // manifest has name/short_name + real icons and start_url/scope cover
            // the whole app — without this key, vite-plugin-pwa fell back to its
            // own placeholder manifest (start_url/scope "/build/", no icons at
            // all), which silently fails Chrome's installability check.
            manifest: {
                name: 'HunianID',
                short_name: 'HunianID',
                description: 'Aplikasi manajemen perumahan HunianID',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                background_color: '#f3fbf9',
                theme_color: '#142033',
                lang: 'id',
                icons: [
                    {
                        src: '/icons/icon-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/icon-maskable-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
        }),
    ],
});
