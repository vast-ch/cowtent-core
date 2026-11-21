import Route from '@ember/routing/route';
import { service } from '@ember/service';

import { language } from 'virtual:blog-site';

import { tagWords } from '../../lib/tag-name.mjs';

import type IntlService from 'ember-intl/services/intl';

// One language a blog: its words around the posts and its tag names
// (languages/*.yaml, lib/language.mjs)
export default class ApplicationRoute extends Route {
  @service declare intl: IntlService;

  beforeModel() {
    this.intl.addTranslations(language.locale, language.messages);
    this.intl.setLocale(language.locale);
    // A tag without a name shows its id in words: trail-running is
    // "Trail Running"
    this.intl.setOnMissingTranslation((key, locales) =>
      key.startsWith('tags.')
        ? tagWords(key.slice('tags.'.length))
        : `Missing translation "${key}" for locale "${locales.join(', ')}"`,
    );
  }
}
