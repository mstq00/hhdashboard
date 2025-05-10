// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // 환경 변수 프리픽스 설정
    envPrefix: 'VITE_',
    
    // 빌드 설정
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        // 청크 크기 경고 임계값 설정
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            input: {
                main: 'index.html'
            },
            output: {
                manualChunks: {
                    'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
                    'vendor': ['chart.js', 'flatpickr']
                }
            }
        }
    },

    // 서버 설정
    server: {
        port: 5173,
        open: true,
        cors: true,
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true
            }
        }
    },

    // 리졸브 설정
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            'firebase/app': 'firebase/app',
            'firebase/auth': 'firebase/auth',
            'firebase/firestore': 'firebase/firestore'
        }
    },

    // 최적화 설정
    optimizeDeps: {
        include: ['firebase/app', 'firebase/auth', 'firebase/firestore']
    },

    // CSS 관련 설정
    css: {
        devSourcemap: true,
        preprocessorOptions: {
            scss: {
                additionalData: `@import "@/styles/variables.scss";`
            }
        }
    },

    // 플러그인 설정
    plugins: []
});