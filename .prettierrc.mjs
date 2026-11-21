export default {
  // The Tailwind plugin sorts class lists and has to come last
  plugins: [
    'prettier-plugin-ember-template-tag',
    'prettier-plugin-tailwindcss',
  ],
  tailwindStylesheet: './app/styles/app.css',
  overrides: [
    {
      files: '*.{js,gjs,ts,gts,mjs,mts,cjs,cts}',
      options: {
        singleQuote: true,
        templateSingleQuote: false,
      },
    },
  ],
};
