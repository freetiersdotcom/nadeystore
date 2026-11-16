import astroEslintParser from 'astro-eslint-parser';
import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import typescriptParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  ...eslintPluginAstro.configs['flat/recommended'],
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      parser: astroEslintParser,
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
    },
  },
  {
    files: ['**/*.{js,jsx,astro}'],
    rules: {
      'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
    },
  },
  {
    // Define the configuration for `<script>` tag.
    // Script in `<script>` is assigned a virtual file name with the `.js` extension.
    files: ['**/*.{ts,tsx}', '**/*.astro/*.js'],
    languageOptions: {
      parser: typescriptParser,
    },
    rules: {
      // Note: you must disable the base rule as it can report incorrect errors
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // Page scripts read dynamic API JSON and window globals: `any` stays visible as a warning there, but does not fail the check.
    files: ['**/*.astro', '**/*.astro/*.ts', '**/*.astro/*'],
    rules: { '@typescript-eslint/no-explicit-any': 'warn' },
  },
  {
    // Standard analytics / consent / language-switch snippets, written in the ES5 style these vendors ship (var, empty catch, ...).
    files: [
      '**/components/common/Tracking.astro', '**/components/common/Tracking.astro/*',
      '**/components/common/ConsentBanner.astro', '**/components/common/ConsentBanner.astro/*',
      '**/components/common/LanguageSwitcher.astro', '**/components/common/LanguageSwitcher.astro/*',
    ],
    rules: {
      'no-var': 'off', 'no-empty': 'off', 'prefer-rest-params': 'off', 'prefer-spread': 'off',
      '@typescript-eslint/no-unused-vars': 'off', '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['.k48-removed', 'dist', 'node_modules', '.github', 'types.generated.d.ts', '.astro'],
  },
];
