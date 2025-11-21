import eslint from '@eslint/js';
import tslint from 'typescript-eslint';
import globals from 'globals';

export default tslint.config(
    eslint.configs.recommended,
    ...tslint.configs.recommended,
    { 
        name: 'global-ignores',
        ignores: [
            'lib',
        ]
    },
    {
        name: 'src-config',
        files: ['src/**/*.js', 'src/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2017,
                ...globals.browser,
                describe: true,
                context: true,
                it: true,
                before: true,
                beforeEach: true,
                after: true,
                afterEach: true,
            },
            ecmaVersion: 2020,
            sourceType: 'module',
            parser: tslint.parser,
        },
        plugins: {
            '@typescript-eslint': tslint.plugin
        },
        rules: {
            indent: ['error', 4],
            'linebreak-style': ['error', 'unix'],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'no-console': [0],
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    "args": "all",
                    "argsIgnorePattern": "^_",
                    "caughtErrors": "all",
                    "caughtErrorsIgnorePattern": "^_",
                    "destructuredArrayIgnorePattern": "^_",
                    "varsIgnorePattern": "^_",
                    "ignoreRestSiblings": true
                }
            ]
        },
        ignores: [
            'test',
            '*.json',
            'nginx.conf',
            'index.html',
            '*.md',
        ]
    },
    {
        name: 'test-config',
        files: ['test/**/*.js', 'test/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.mocha,
                ...globals.chai,
            },
        },
        rules: {
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
        }
    },
);
