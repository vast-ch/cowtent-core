import type { TOC } from '@ember/component/template-only';

/**
 * The bottom edge of the header as a mountain skyline: the area above the
 * ridge line, in the text colour (the header's background). Decorative.
 */
const SKY =
  'M0 70 L60 52 L95 60 L150 30 L190 46 L240 18 L285 40 L330 34 L380 8 L430 38 L470 28 L520 48 L575 22 L620 40 L680 14 L730 44 L780 36 L830 54 L890 26 L940 42 L1000 32 L1000 0 L0 0 Z';

export const Ridge: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    aria-hidden="true"
    viewBox="0 0 1000 80"
    preserveAspectRatio="none"
    ...attributes
  >
    <path d={{SKY}} fill="currentColor" />
  </svg>
</template>;
