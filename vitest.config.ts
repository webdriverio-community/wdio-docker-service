import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        include: ['test/unit/**/*.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
    },
    resolve: {
        alias: {
            '@root': path.resolve(__dirname, './src'),
            '@test': path.resolve(__dirname, './test'),
        },
    },
});
