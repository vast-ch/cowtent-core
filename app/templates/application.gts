import { PortalTarget } from 'frontile/overlays';
import { pageTitle } from 'ember-page-title';

import site from 'virtual:blog-site';

import { ThemeLayout } from '../components/themed.gts';

/**
 * Every page in the layout of the theme (app/themes/<theme>/layout.gts)
 */
<template>
  {{pageTitle site.title separator=" - "}}

  <ThemeLayout>{{outlet}}</ThemeLayout>

  <PortalTarget class="relative z-40" />
</template>
