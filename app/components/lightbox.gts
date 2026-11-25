import { on } from '@ember/modifier';

import { Overlay } from 'frontile/overlays';

import type { TOC } from '@ember/component/template-only';

/** A button on a lightbox's dark: round, lighter under the mouse */
export const LIGHTBOX_BUTTON =
  'rounded-full hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white';

const closeBeside = (close: () => void) => (event: MouseEvent) => {
  if ((event.target as HTMLElement).hasAttribute('data-beside')) close();
};

/**
 * A full-screen lightbox on Frontile's Overlay, which brings Esc, the focus
 * kept inside and given back, the page that doesn't scroll behind and the
 * fade: dark, a bar with `@label` (and the `<:bar>` block's buttons) and
 * the close button, the content filling the rest. A click beside the
 * content, on anything marked `data-beside`, closes it too. The gallery's
 * photos and the route's map both open in one.
 */
export const Lightbox: TOC<{
  Args: {
    isOpen: boolean;
    onClose: () => void;
    label: string;
    closeLabel: string;
  };
  Blocks: { default: []; bar: [] };
  Element: HTMLDivElement;
}> = <template>
  <Overlay
    @isOpen={{@isOpen}}
    @onClose={{@onClose}}
    @backdrop="none"
    @closeOnOutsideClick={{false}}
    @closeOnOverlayElementClick={{false}}
    @blockScroll={{true}}
  >
    {{! A mouse shortcut for Esc and the close button }}
    {{! template-lint-disable no-invalid-interactive }}
    <div
      class="flex h-dvh w-screen flex-col bg-slate-950/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={{@label}}
      data-beside
      data-test-lightbox
      {{on "click" (closeBeside @onClose)}}
      ...attributes
    >
      <div
        class="flex items-center gap-2 px-4 py-3 font-mono text-sm text-slate-300"
        data-beside
      >
        <span
          class="flex-1"
          data-beside
          data-test-lightbox-label
        >{{@label}}</span>
        {{yield to="bar"}}
        <button
          type="button"
          class="{{LIGHTBOX_BUTTON}} p-2"
          aria-label={{@closeLabel}}
          data-test-lightbox-close
          {{on "click" @onClose}}
        >
          <svg viewBox="0 0 24 24" class="size-6" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
      {{yield}}
    </div>
    {{! template-lint-enable no-invalid-interactive }}
  </Overlay>
</template>;
