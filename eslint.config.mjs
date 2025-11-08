import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    name: "custom-ignores",
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default config;
