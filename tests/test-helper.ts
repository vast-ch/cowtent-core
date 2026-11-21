import 'qunit/qunit/qunit.css';

import { setApplication } from '@ember/test-helpers';
import { setTesting } from '@embroider/macros';
import * as QUnit from 'qunit';
import { setup } from 'qunit-dom';
import { start as qunitStart, setupEmberOnerrorValidation } from 'ember-qunit';

import Application from '../app/app.ts';
import config from '../app/config/environment.ts';

export function start() {
  config.locationType = 'none';
  config.APP.rootElement = '#ember-testing';
  config.APP.autoboot = false;
  setTesting(true);
  setApplication(Application.create(config.APP));

  setup(QUnit.assert);
  setupEmberOnerrorValidation();

  qunitStart();
}
