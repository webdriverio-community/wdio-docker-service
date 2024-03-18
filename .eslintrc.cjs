/* eslint-env node */
module.exports = {
    env: {
        es6: true,
        node: true,
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    root: true,
    rules: {
        indent: ['error', 4],
        'linebreak-style': ['error', 'unix'],
        quotes: ['error', 'single'],
        semi: ['error', 'always'],
        'no-console': [0],
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    globals: {
        describe: true,
        context: true,
        it: true,
        before: true,
        beforeEach: true,
        after: true,
        afterEach: true,
    },
};
