import { fetchFeedIds, fetchStories } from '../api/hn';
import type { FeedId, Story } from '../api/types';

const PAGE_SIZE = 20;

/**
 * One feed's worth of state: the id list, the stories loaded so far and the
 * paging cursor.
 *
 * Instances are cached per feed id (see `feedFor`), which is what makes
 * switching tabs feel instant and keeps the reader's place: coming back to
 * "Top" reuses the same instance, already holding its stories.
 */
export class FeedController {
	stories = $state<Story[]>([]);
	loading = $state(false);
	loadingMore = $state(false);
	error = $state<string | null>(null);

	#ids: number[] = [];
	#cursor = 0;
	#loaded = false;
	#request: AbortController | null = null;

	constructor(readonly feed: FeedId) {}

	/** True once every id in the feed has been turned into a story. */
	exhausted = $derived(this.#loaded && this.stories.length > 0 && this.#cursor >= this.#ids.length);

	async load(): Promise<void> {
		if (this.#loaded || this.loading) return;
		this.loading = true;
		this.error = null;
		this.#request?.abort();
		this.#request = new AbortController();

		try {
			this.#ids = await fetchFeedIds(this.feed, this.#request.signal);
			this.#cursor = 0;
			this.stories = [];
			this.#loaded = true;
			await this.#appendPage();
		} catch (error) {
			if (isAbort(error)) return;
			this.#loaded = false;
			this.error = 'Could not reach Hacker News. Check your connection and try again.';
		} finally {
			this.loading = false;
		}
	}

	async loadMore(): Promise<void> {
		if (!this.#loaded || this.loading || this.loadingMore || this.exhausted) return;
		this.loadingMore = true;
		try {
			await this.#appendPage();
		} catch (error) {
			if (!isAbort(error)) {
				this.error = 'Could not load more stories.';
			}
		} finally {
			this.loadingMore = false;
		}
	}

	/** Drops everything and refetches — used by the error state's retry button. */
	async retry(): Promise<void> {
		this.#loaded = false;
		this.error = null;
		await this.load();
	}

	async #appendPage(): Promise<void> {
		const slice = this.#ids.slice(this.#cursor, this.#cursor + PAGE_SIZE);
		if (!slice.length) return;
		const page = await fetchStories(slice, this.#request?.signal);
		this.#cursor += slice.length;
		this.stories = [...this.stories, ...page];
	}
}

function isAbort(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError';
}

const controllers = new Map<FeedId, FeedController>();

export function feedFor(feed: FeedId): FeedController {
	let controller = controllers.get(feed);
	if (!controller) {
		controller = new FeedController(feed);
		controllers.set(feed, controller);
	}
	return controller;
}
