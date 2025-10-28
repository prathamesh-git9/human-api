import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            enabled: true,
            reporter: ['text', 'html'],
        },
    },
});
