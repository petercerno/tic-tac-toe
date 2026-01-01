import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, '../shared'),
        },
    },
    server: {
        proxy: {
            // Proxy API requests to Express server during development
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
});
