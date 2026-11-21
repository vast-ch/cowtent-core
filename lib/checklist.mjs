import { visit } from 'unist-util-visit';

/**
 * Checklists, written like Obsidian's: a list item that starts with a
 * symbol in brackets gets a badge for it instead of the bullet.
 *
 *   - [x] **Started at sunrise**
 *     The ridge was ours alone until ten.
 *   - [-] Only one litre of water
 *
 * In such an item a new line stays a new line, so a bold first line reads
 * as its heading. A symbol that isn't here stays text, as in Obsidian.
 */
export const CHECKS = {
  ' ': 'todo',
  x: 'done',
  X: 'done',
  '+': 'plus',
  p: 'plus',
  '-': 'minus',
  c: 'minus',
  '?': 'question',
  '!': 'important',
  i: 'information',
  '*': 'star',
};

// Feed readers don't run our CSS: there the badge is an emoji
const EMOJI = {
  todo: '⬜',
  done: '✅',
  plus: '➕',
  minus: '➖',
  question: '❓',
  important: '❗',
  information: 'ℹ️',
  star: '⭐',
};

const MARKER = /^\[(.)\] /;

export function remarkChecklist({ language, feed = false }) {
  return (tree) => {
    visit(tree, 'listItem', (item) => {
      const check = checkOf(item);

      if (!check) return;

      // GFM's own [ ] and [x] would become an <input>
      item.checked = null;
      item.data = {
        ...item.data,
        hProperties: { className: ['check'], dataCheck: check },
      };

      visit(item, 'text', (node, index, parent) => {
        if (!node.value.includes('\n')) return;

        const lines = node.value
          .split('\n')
          .flatMap((value, line) =>
            line
              ? [{ type: 'break' }, { type: 'text', value }]
              : [{ type: 'text', value }],
          );

        parent.children.splice(index, 1, ...lines);

        return index + lines.length;
      });

      item.children[0].children.unshift(
        feed
          ? { type: 'text', value: `${EMOJI[check]} ` }
          : {
              type: 'checkMark',
              data: {
                hName: 'span',
                hProperties: {
                  className: ['check-mark'],
                  dataCheck: check,
                  role: 'img',
                  ariaLabel: language.t(`post.checklist.${check}`),
                },
              },
            },
      );
    });
  };
}

// What the item's symbol stands for, taken off its text
function checkOf(item) {
  const paragraph = item.children[0];

  if (paragraph?.type !== 'paragraph') return;
  if (item.checked === true) return 'done';
  if (item.checked === false) return 'todo';

  const text = paragraph.children[0];
  const marker = text?.type === 'text' && text.value.match(MARKER);
  const check = marker && CHECKS[marker[1]];

  if (!check) return;

  text.value = text.value.slice(marker[0].length);

  return check;
}
