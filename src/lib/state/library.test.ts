import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('../db', () => ({
	getSavedStory: vi.fn(async () => undefined),
	saveStory: vi.fn(async () => {})
}));

// The comment tree resolves only when the test says so, like a busy thread.
let finishTree: (value: unknown[]) => void = () => {};
vi.mock('../api/hn', () => ({
	fetchItem: vi.fn(async () => ({ id: 7, type: 'story', title: 'Headline', by: 'a', score: 1, time: 1, kids: [8] })),
	fetchCommentTree: vi.fn(() => new Promise((resolve) => (finishTree = resolve)))
}));

import { library } from './library.svelte';

describe('opening a discussion', () => {
	it('hands over the story before its comment tree arrives', async () => {
		const early = vi.fn();
		const opened = library.open(7, early);
		await vi.waitFor(() => expect(early).toHaveBeenCalledOnce());
		expect(early.mock.calls[0][0].title).toBe('Headline');

		const tree = [{ id: 8 }];
		finishTree(tree);
		await expect(opened).resolves.toMatchObject({ comments: tree, offline: false });
	});
});
