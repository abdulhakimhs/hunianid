import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
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
            outDir: 'public',
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
