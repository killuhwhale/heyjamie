import { env } from "./src/env.mjs";

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.mjs");

async function rewrites() {
  return [
    {
      source: '/about',
      destination: '/',
    },
  ]
}
/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  output: "standalone",
  basePath: env.BASEPATH,
  // rewrites: rewrites,

  /**
   * If you have `experimental: { appDir: true }` set, then you must comment the below `i18n` config
   * out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },

};



export default config;
