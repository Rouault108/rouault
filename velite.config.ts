import rehypeKatex from 'rehype-katex';
import remarkEmoji from 'remark-emoji';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkSupersub from 'remark-supersub';
import { defineCollection, defineConfig, s } from 'velite';

const notes = defineCollection({
    name: 'Note',
    pattern: 'notes/**/*.md',
    schema: s
        .object({
            title: s.string().optional(),
            slug: s.path(),
            date: s.isodate().optional(),
            updated: s.isodate().optional(),
            content: s.markdown(),
            excerpt: s.excerpt().optional(),
            toc: s.toc().optional(),
        })
        .transform((data) => ({ ...data, permalink: `/notes/${data.slug}` })),
});

export default defineConfig({
    root: 'content',
    output: {
        data: '.velite',
        assets: 'dist/static',
        base: '/static/',
        name: '[name]-[hash:6].[ext]',
        clean: true,
    },
    collections: { notes },
    markdown: {
        remarkPlugins: [
            [remarkGfm, { singleTilde: false }],
            remarkMath,
            remarkEmoji as any,
            remarkSupersub,
        ],
        rehypePlugins: [rehypeKatex],
    },
});
