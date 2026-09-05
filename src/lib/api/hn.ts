import type { Comment, FeedId, SearchHit, Story } from './types';
import { FEEDS } from './types';

export { fetchCommentTree } from './tree';
export type { TreeOptions } from './tree';

const FIREBASE = 'https://hacker-news.firebaseio.com/v0';
const ALGOLIA = 'https://hn.algolia.com/api/v1';

export class ApiError extends Error {
	constructor(
		message: string,
		readonly cause?: unknown
	) {
		super(message);
		this.name = 'ApiError';
	}
}

type Fetch = typeof globalThis.fetch;

async function getJson<T>(url: string, signal?: AbortSignal, fetchFn: Fetch = fetch): Promise<T> {
	let response: Response;
	try {
		response = await fetchFn(url, { signal });
	} catch (error) {
		// AbortError is the caller cancelling on purpose — pass it through
		// untouched so callers can tell "stale request" from "network down".
		if (error instanceof DOMException && error.name === 'AbortError') throw error;
		throw new ApiError('Network request failed', error);
	}
	if (!response.ok) throw new ApiError(`Request failed with status ${response.status}`);
	try {
		return (await response.json()) as T;
	} catch (error) {
		throw new ApiError('Response was not valid JSON', error);
	}
}

/**
 * The id list for a feed. Hacker News returns up to 500 ids in one go and the
 * app pages through them locally, which is why there is no offset parameter.
 */
export function fetchFeedIds(feed: FeedId, signal?: AbortSignal, fetchFn?: Fetch): Promise<number[]> {
	const endpoint = FEEDS.find((f) => f.id === feed)?.endpoint;
	if (!endpoint) throw new ApiError(`Unknown feed: ${feed}`);
	return getJson<number[]>(`${FIREBASE}/${endpoint}.json`, signal, fetchFn);
}

export function fetchItem<T extends Story | Comment>(
	id: number,
	signal?: AbortSignal,
	fetchFn?: Fetch
): Promise<T | null> {
	return getJson<T | null>(`${FIREBASE}/item/${id}.json`, signal, fetchFn);
}

/** Items in parallel, keeping the requested order and dropping dead entries. */
export async function fetchStories(
	ids: number[],
	signal?: AbortSignal,
	fetchFn?: Fetch
): Promise<Story[]> {
	const items = await Promise.all(ids.map((id) => fetchItem<Story>(id, signal, fetchFn)));
	return items.filter((item): item is Story => Boolean(item) && !item!.deleted && !item!.dead);
}

interface AlgoliaResponse {
	hits: {
		objectID: string;
		title: string | null;
		url: string | null;
		author: string;
		points: number | null;
		num_comments: number | null;
		created_at_i: number;
	}[];
}

export async function searchStories(
	query: string,
	signal?: AbortSignal,
	fetchFn?: Fetch
): Promise<SearchHit[]> {
	const url = `${ALGOLIA}/search?tags=story&hitsPerPage=30&query=${encodeURIComponent(query)}`;
	const data = await getJson<AlgoliaResponse>(url, signal, fetchFn);
	return data.hits
		.filter((hit) => hit.title)
		.map((hit) => ({
			id: Number(hit.objectID),
			title: hit.title as string,
			url: hit.url ?? undefined,
			author: hit.author,
			points: hit.points ?? 0,
			numComments: hit.num_comments ?? 0,
			createdAt: hit.created_at_i
		}));
}
