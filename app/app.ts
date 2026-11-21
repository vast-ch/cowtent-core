import './styles/app.css';
import '@warp-drive/ember/install';

import EmberApp from 'ember-strict-application-resolver';
import IntlService from 'ember-intl/services/intl';
import PageTitleService from 'ember-page-title/services/page-title';

import config from './config/environment.ts';
import Router from './router.ts';

export default class App extends EmberApp {
  modulePrefix = config.modulePrefix;
  modules = {
    './router': Router,
    './services/page-title': PageTitleService,
    './services/intl': IntlService,
    ...import.meta.glob('./{controllers,routes,templates}/**/*.{ts,gts}', {
      eager: true,
    }),
    ...import.meta.glob('./services/*.ts', { eager: true }),
  };
}
