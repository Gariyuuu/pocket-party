import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // scripts/ is plain standalone Node/CJS tooling (asset generators etc.),
    // not part of the app bundle — it doesn't need the app's lint rules.
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "scripts/**"],
  },
];

export default eslintConfig;
