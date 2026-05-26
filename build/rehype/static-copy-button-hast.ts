import {
  createStaticCopyButtonContract,
  type StaticCopyButtonOptions,
} from '../../shared/static-copy-button-html.js';
import { createStaticIconHast } from './static-icon-hast.js';
import { type HastNode } from './hast-utils.js';

const createElement = (
  tagName: string,
  properties: Record<string, unknown>,
  children: HastNode[] = [],
): HastNode => ({
  type: 'element',
  tagName,
  properties,
  children,
});

const toProperties = (
  attributes: ReturnType<typeof createStaticCopyButtonContract>['buttonAttributes'],
): Record<string, unknown> =>
  Object.fromEntries(
    attributes.map((attribute) => [
      attribute.name,
      attribute.value === undefined ? true : attribute.value,
    ]),
  );

export const createStaticCopyButtonHast = (options: StaticCopyButtonOptions): HastNode => {
  const contract = createStaticCopyButtonContract(options);
  return createElement(
    'span',
    {
      className: [...contract.controlClassNames],
      'data-copy-control': 'true',
    },
    [
      createElement(
        'button',
        {
          className: [...contract.buttonClassNames],
          ...toProperties(contract.buttonAttributes),
        },
        [
          createElement(
            'span',
            {
              className: ['static-icon'],
              'aria-hidden': 'true',
            },
            [createStaticIconHast('copy')],
          ),
        ],
      ),
      createElement(
        'span',
        {
          id: contract.statusId,
          className: ['static-copy-button__status', 'sr-only'],
          role: 'status',
          'aria-live': 'polite',
          'data-copy-status': 'true',
        },
        [],
      ),
    ],
  );
};
