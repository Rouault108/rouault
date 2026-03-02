import {
  getDigits,
  getOrCreateProperties,
  type HastNode,
  setStyleCustomProperty,
  toInteger,
} from './hast-utils.js';

/**
 * `.prose ol` 向けに、桁数注釈とカウンター同期情報を build-time で付与する。
 * - `data-marker-digits="3"` の自動判定
 * - `start` / `reversed` / `li[value]` を CSS カウンターへ反映
 * - list-style:none 劣化対策として role を補強
 */
export function rehypeOrderedListContracts() {
  return (tree: unknown) => {
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const current = node as HastNode;
      if (current.type === 'element' && current.tagName === 'ol') {
        const props = getOrCreateProperties(current);
        const liChildren = (current.children ?? []).filter(
          (child): child is HastNode => child.type === 'element' && child.tagName === 'li',
        );
        const itemCount = liChildren.length;

        const hasReversed =
          props.reversed !== undefined && props.reversed !== false && props.reversed !== 'false';
        const explicitStart = toInteger(props.start);
        const start = explicitStart ?? (hasReversed ? itemCount : 1);
        const step = hasReversed ? -1 : 1;
        const end = itemCount > 0 ? start + step * (itemCount - 1) : start;
        const baseCounterValue = start - step;

        const explicitValues = liChildren
          .map((item) => toInteger(getOrCreateProperties(item).value))
          .filter((value): value is number => value !== null);

        const maxDigits = Math.max(
          getDigits(start),
          getDigits(end),
          ...explicitValues.map((value) => getDigits(value)),
        );

        if (maxDigits >= 3) {
          props['data-marker-digits'] = '3';
        } else {
          delete props['data-marker-digits'];
        }

        if (props.role === undefined) {
          props.role = 'list';
        }
        setStyleCustomProperty(props, '--ui-ol-counter-reset', String(baseCounterValue));
        setStyleCustomProperty(props, '--ui-ol-counter-step', String(step));

        for (const item of liChildren) {
          const itemProps = getOrCreateProperties(item);
          if (itemProps.role === undefined) {
            itemProps.role = 'listitem';
          }

          const explicitValue = toInteger(itemProps.value);
          if (explicitValue === null) {
            delete itemProps['data-ol-has-value'];
            continue;
          }

          itemProps['data-ol-has-value'] = '';
          setStyleCustomProperty(itemProps, '--ui-ol-counter-set', String(explicitValue - step));
        }
      }

      if (!Array.isArray(current.children)) {
        return;
      }
      for (const child of current.children) {
        visit(child);
      }
    };

    visit(tree);
  };
}
