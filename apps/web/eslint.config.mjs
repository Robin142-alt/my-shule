import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Large legacy/generated command-center surfaces still carry broad payload shapes.
      // Keep this visible in CI without blocking production deploys while typed contracts are migrated domain by domain.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".npm-cache/**",
    ".vercel/**",
    ".appdata*/**",
    ".localappdata/**",
    "artifacts/**",
    "node_modules/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
    ".swc/**",
    ".vercel/**",
    ".npm-cache/**",
    "src/**/refactor*.js",
  ]),
]);

export default eslintConfig;
