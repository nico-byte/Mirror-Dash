import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './',
    resolve: {
        alias: {
            '@': resolve(__dirname, '../src'),
            '@/components': resolve(__dirname, '../src/game/components'),
            '@/entities': resolve(__dirname, '../src/game/entities'),
            '@/levels': resolve(__dirname, '../src/game/levels'),
            '@/scenes': resolve(__dirname, '../src/game/scenes')
        }
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
    },
    server: {
        port: 8080
    }
});
