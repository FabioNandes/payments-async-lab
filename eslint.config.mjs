// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const NO_SLEEP =
  'Proibido espera fixa. Use polling com timeout (expect.poll ou o helper único de poll).';

export default defineConfig(
  { ignores: ['node_modules/', 'dist/', 'playwright-report/', 'test-results/', 'blob-report/'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // Regra do portfólio: zero `sleep` fixo. O único ponto autorizado a esperar
    // é o helper de polling, com eslint-disable explícito e justificado.
    rules: {
      'no-restricted-globals': ['error', { name: 'setTimeout', message: NO_SLEEP }],
      'no-restricted-properties': ['error', { property: 'waitForTimeout', message: NO_SLEEP }],
      'no-restricted-imports': ['error', { name: 'node:timers/promises', message: NO_SLEEP }],
    },
  },
  { files: ['**/*.{js,mjs,cjs}'], extends: [tseslint.configs.disableTypeChecked] },
  prettier,
);
