// Tailwind 3 through PostCSS (the @astrojs/tailwind integration does not support Astro 6+).
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
