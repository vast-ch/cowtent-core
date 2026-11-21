export default {
  extends: ['stylelint-config-standard'],
  rules: {
    // Tailwind CSS 4 configures itself in CSS
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'plugin',
          'theme',
          'source',
          'utility',
          'variant',
          'custom-variant',
          'apply',
        ],
      },
    ],
    // @apply takes Tailwind classes, variants like before: included
    'at-rule-prelude-no-invalid': [true, { ignoreAtRules: ['apply'] }],
    'import-notation': 'string',
  },
};
