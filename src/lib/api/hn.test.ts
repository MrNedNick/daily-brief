import { describe, expect, it, vi } from 'vitest';
import { ApiError, fetchCommentTree, fetchStories, searchStories } from './hn';
import type { Comment, Story } from './types';

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
}

const story = (id: number, extra: Partial<Story> = {}): Story => ({
	id,
	title: `Story ${id}`,
	by: 'someone',
	score: 10,
	time: 1_700_000_000,
	descendants: 0,
	...extra
});

describe('fetchStories', () => {
	it('keeps the requested order', async () => {
		const fetchFn = vi.fn(async (url: string) => {
			const id = Number(url.match(/item\/(\d+)/)![1]);
			return jsonResponse(story(id));
		});
		const result = await fetchStories([3, 1, 2], undefined, fetchFn as unknown as typeof fetch);
		expect(result.map((s) => s.id)).toEqual([3, 1, 2]);
	});

	it('drops deleted and dead items instead of rendering blanks', async () => {
		const fetchFn = vi.fn(async (url: string) => {
			const id = Number(url.match(/item\/(\d+)/)![1]);
			if (id === 2) return jsonResponse(story(2, { deleted: true }));
			if (id === 3) return jsonResponse(null);
			return jsonResponse(story(id));
		});
		const result = await fetchStories([1, 2, 3, 4], undefined, fetchFn as unknown as typeof fetch);
		expect(result.map((s) => s.id)).toEqual([1, 4]);
	});

	it('reports a failed request as an ApiError', async () => {
		const fetchFn = vi.fn(async () => new Response('nope', { status: 500 }));
		await expect(
			fetchStories([1], undefined, fetchFn as unknown as typeof fetch)
		).rejects.toBeInstanceOf(ApiError);
	});
});

describe('fetchCommentTree', () => {
	const comments: Record<number, Comment> = {
		1: { id: 1, by: 'a', text: 'root', time: 1, kids: [2, 3] },
		2: { id: 2, by: 'b', text: 'child', time: 2, kids: [4] },
		3: { id: 3, by: 'c', text: 'deleted', time: 3, deleted: true },
		4: { id: 4, by: 'd', text: 'grandchild', time: 4 }
	};

	const fetchFn = vi.fn(async (url: string) =>
		jsonResponse(comments[Number(url.match(/item\/(\d+)/)![1])] ?? null)
	);

	it('nests replies and skips deleted ones', async () => {
		const tree = await fetchCommentTree([1], { fetchFn: fetchFn as unknown as typeof fetch });
		expect(tree).toHaveLength(1);
		expect(tree[0].replies.map((r) => r.id)).toEqual([2]);
		expect(tree[0].replies[0].replies[0].id).toBe(4);
	});

	it('stops at maxDepth and leaves the rest to be loaded on demand', async () => {
		const tree = await fetchCommentTree([1], {
			maxDepth: 1,
			fetchFn: fetchFn as unknown as typeof fetch
		});
		// Depth 1 is fetched, its children are not — but their ids survive so
		// the UI can offer a "load more replies" button.
		expect(tree[0].replies[0].replies).toEqual([]);
		expect(tree[0].replies[0].kids).toEqual([4]);
	});

	it('fetches each level in one batch, not one node at a time', async () => {
		const order: number[][] = [];
		const batched = vi.fn(async (url: string) => {
			const id = Number(url.match(/item\/(\d+)/)![1]);
			order.push([id]);
			return jsonResponse(comments[id] ?? null);
		});
		await fetchCommentTree([1], { fetchFn: batched as unknown as typeof fetch });
		// Level 2 holds both children of the root; a node-by-node walk would
		// fetch 4 before 3 because it descends into 2 first.
		const ids = order.flat();
		expect(ids.indexOf(3)).toBeLessThan(ids.indexOf(4));
	});

	it('stops at maxNodes so a huge thread still opens', async () => {
		const wide = vi.fn(async (url: string) => {
			const id = Number(url.match(/item\/(\d+)/)![1]);
			return jsonResponse({ id, by: 'x', text: 't', time: 1, kids: [id * 10, id * 10 + 1] });
		});
		const tree = await fetchCommentTree([1, 2, 3], {
			maxNodes: 5,
			maxDepth: 10,
			fetchFn: wide as unknown as typeof fetch
		});
		expect(wide.mock.calls.length).toBeLessThanOrEqual(5);
		expect(tree.length).toBeGreaterThan(0);
	});
});

describe('searchStories', () => {
	it('maps Algolia fields and drops hits without a title', async () => {
		const fetchFn = vi.fn(async () =>
			jsonResponse({
				hits: [
					{
						objectID: '42',
						title: 'Found it',
						url: 'https://example.com',
						author: 'me',
						points: 7,
						num_comments: 3,
						created_at_i: 1_700_000_000
					},
					{
						objectID: '43',
						title: null,
						url: null,
						author: 'x',
						points: null,
						num_comments: null,
						created_at_i: 1
					}
				]
			})
		);
		const hits = await searchStories('found', undefined, fetchFn as unknown as typeof fetch);
		expect(hits).toEqual([
			{
				id: 42,
				title: 'Found it',
				url: 'https://example.com',
				author: 'me',
				points: 7,
				numComments: 3,
				createdAt: 1_700_000_000
			}
		]);
	});

	it('encodes the query so a phrase does not break the URL', async () => {
		const fetchFn = vi.fn(async (_url: string) => jsonResponse({ hits: [] }));
		await searchStories('a b&c', undefined, fetchFn as unknown as typeof fetch);
		expect(fetchFn.mock.calls[0][0]).toContain('query=a%20b%26c');
	});
});
