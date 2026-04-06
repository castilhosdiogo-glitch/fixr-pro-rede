import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
<<<<<<< HEAD
  { ignores: ["dist", "playwright-fixture.ts", "supabase/functions/**"] },
=======
  { ignores: ["dist"] },
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
<<<<<<< HEAD
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
=======
      "@typescript-eslint/no-unused-vars": "off",
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
    },
  },
);
