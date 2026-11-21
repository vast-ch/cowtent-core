const ENV = {
  modulePrefix: 'cowtent-core',
  environment: import.meta.env.DEV ? 'development' : 'production',
  // Where the site starts on its host (vite.config.mjs)
  rootURL: import.meta.env.BASE_URL,
  locationType: 'history',
  EmberENV: {},
  APP: {} as Record<string, unknown>,
};

export default ENV;
