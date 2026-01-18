import { expect, fixture, html } from '@open-wc/testing';
import './hello-world.js';
import type { HelloWorld } from './hello-world.js';

describe('HelloWorld Component', () => {
    it('初期値が正しく表示されること', async () => {
        // ジェネリクス <HelloWorld> を使うことで、el が HelloWorld型として扱われる
        const el = await fixture<HelloWorld>(html`<hello-world></hello-world>`);

        // Shadow DOM内の要素を検証
        expect(el.shadowRoot?.textContent).to.contain('Hello World!');

        // プロパティの初期値を検証
        expect(el.title).to.equal('Hello World');
    });

    it('プロパティ変更が反映されること', async () => {
        const el = await fixture<HelloWorld>(html`<hello-world></hello-world>`);

        // プロパティを変更
        el.title = 'Test';

        // 更新完了を待機（Litの更新サイクル）
        await el.updateComplete;

        // 反映を確認
        expect(el.shadowRoot?.textContent).to.contain('Hello Test!');
    });
});
