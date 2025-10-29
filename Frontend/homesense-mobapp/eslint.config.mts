// ✅ ESLint 9 Flat Config (React Native + TypeScript)
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { FlatCompat } from "@eslint/eslintrc"; // adds legacy compatibility
import { defineConfig } from "eslint/config";

// create compat instance to translate old-style configs
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // convert any legacy configs to flat style
  ...compat.extends("plugin:react/recommended"),
  ...compat.extends("plugin:react-hooks/recommended"),

  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "react/no-unescaped-entities": "off",
      "react/prop-types": "off",
      "react/display-name": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
]);
