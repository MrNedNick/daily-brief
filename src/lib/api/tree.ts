import { fetchItem } from './hn';
import type { Comment, CommentNode } from './types';

type Fetch = typeof globalThis.fetch;

export interface TreeOptions {
	signal?: AbortSignal;
	/** Levels fetched up front; deeper replies are left for the UI to request. */
	maxDepth?: number;
	/** Hard cap on items fetched, so a 1500-comment thread still opens. */
	maxNodes?: number;
	fetchFn?: Fetch;
}

/**
 * A comment tree, fetched breadth-first.
 *
 * Every id at one depth goes out in a single `Promise.all`, then the next
 * depth does the same with all the children collected from it. Walking the
 * tree node by node instead — the obvious recursive version — serialises a
 * busy thread into hundreds of round trips and takes tens of seconds.
 *
 * `maxNodes` is the other half of that: threads on the front page routinely
 * run past a thousand comments, and fetching all of them before showing
 * anything is worse than showing the first few hundred immediately. What is
 * left keeps its ids, so the UI offers "load more replies" on the edge.
 */
export async function fetchCommentTree(
	ids: number[],
	options: TreeOptions = {}
): Promise<CommentNode[]> {
	const { signal, maxDepth = 4, maxNodes = 240, fetchFn } = options;
	if (!ids.length) return [];

	const roots: CommentNode[] = [];
	// Nodes waiting for their children, paired with the ids to fetch for them.
	let frontier: { parent: CommentNode | null; ids: number[] }[] = [
		{ parent: null, ids: [...ids] }
	];
	let fetched = 0;

	for (let depth = 0; depth <= maxDepth && frontier.length; depth++) {
		// Flatten the whole level into one request batch.
		const batch: { parent: CommentNode | null; id: number }[] = [];
		for (const entry of frontier) {
			for (const id of entry.ids) {
				if (fetched + batch.length >= maxNodes) break;
				batch.push({ parent: entry.parent, id });
			}
		}
		if (!batch.length) break;

		const items = await Promise.all(
			batch.map(({ id }) => fetchItem<Comment>(id, signal, fetchFn))
		);
		fetched += batch.length;

		const next: { parent: CommentNode | null; ids: number[] }[] = [];
		for (const [index, item] of items.entries()) {
			if (!item || item.deleted) continue;
			const node: CommentNode = { ...item, replies: [] };
			const parent = batch[index].parent;
			if (parent) parent.replies.push(node);
			else roots.push(node);

			if (item.kids?.length && depth < maxDepth) {
				next.push({ parent: node, ids: item.kids });
			}
		}
		frontier = next;
	}

	return roots;
}
