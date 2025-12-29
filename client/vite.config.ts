import { defineConfig } from 'vite';

export default defineConfig({
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
