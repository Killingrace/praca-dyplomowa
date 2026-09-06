import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, '.', '');
    var backend = env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
    return {
        plugins: [react()],
        server: {
            allowedHosts: ['laptop-server.com'],
            proxy: {
                '/api': backend,
                '/ws': {
                    target: backend.replace(/^http/, 'ws'),
                    ws: true
                }
            }
        }
    };
});
