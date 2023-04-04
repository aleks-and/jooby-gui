module.exports = {
    root: true,

    extends: [
        'eslint:recommended',
        'airbnb/hooks',
        'airbnb-typescript',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:import/recommended'
    ],

    settings: {
        'import/resolver': {
            typescript: {
                project: './tsconfig.json'
            }
        },

        react: {
            version: 'detect'
        }
    },

    env: {
        es2022: true,
        browser: true
    },

    parser: '@typescript-eslint/parser',

    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        },
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json', './tsconfig.node.json']
    },

    plugins: [
        'react',
        '@typescript-eslint'
    ],

    ignorePatterns: ['/dist', '/node_modules', '/.eslintrc.cjs'],

    rules: {
        '@typescript-eslint/indent': ['error', 4],
        '@typescript-eslint/object-curly-spacing': ['error', 'never'],
        '@typescript-eslint/comma-dangle': ['error', 'never'],
        '@typescript-eslint/space-before-function-paren': ['error', {anonymous: 'always', named: 'always'}],

        "jsx-quotes": ["error", "prefer-double"],
        "space-before-function-paren": ["error", "always"],
        'padding-line-between-statements': [
            'error',
            {blankLine: 'always', prev: '*', next: ['directive', 'return', 'export', 'cjs-export', 'try', 'function']},
            {blankLine: 'always', prev: ['directive', 'export', 'cjs-export', 'try', 'function'], next: '*'},
            {blankLine: 'any', prev: 'directive', next: 'directive'}
        ],
    }
};
