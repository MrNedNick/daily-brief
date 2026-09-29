import { browser } from '$app/environment';
import { base } from '$app/paths';
import { dateKey, fetchEditionFile, fetchOnThisDay, fetchTopOfDay, type OnThisDay } from '../api/brief';
import { isFresh, withExtras } from '../api/edition-file';
import * as db from '../db';
import type { Story } from '../api/types';

interface CachedTop {
	/** When the edition was fetched, ms. */
	fetchedAt: number;
	/** When its ranking was made — the hourly build, or the live fetch. */
	updatedAt?: number;
	stories: Story[];
}

const TOP_KEY = 'top-of-day';
const FACT_KEY = 'on-this-day';
/** The edition is refetched after this long; the fact only when the date changes. */
const TOP_TTL = 15 * 60 * 1000;

/**
 * Today's edition: the biggest stories of the last 24 hours and one story
 * from this date in HN history.
 *
 * Both are kept in IndexedDB. The fact is fetched once per calendar day and
 * served from the cache after that; the edition is refreshed every quarter of
 * an hour. Offline, the last copy of each is shown with the date it is from,
 * rather than an error.
 */
class Edition {
	top = $state<Story[]>([]);
	topLoading = $state(false);
	topError = $state(false);
	/** Set when the stories on screen are a saved copy, not a fresh fetch. */
	topFrom = $state<number | null>(null);
	/** When the ranking on screen was made, ms. */
	updatedAt = $state<number | null>(null);

	fact = $state<OnThisDay | null>(null);
	factLoading = $state(false);
	factError = $state(false);

	#started = false;

	load(): void {
		if (!browser || this.#started) return;
		this.#started = true;
		void this.#loadTop();
		void this.#loadFact();
	}

	retry(): void {
		this.#started = false;
		this.topError = false;
		this.factError = false;
		this.load();
	}

	async #loadTop(): Promise<void> {
		this.topLoading = true;
		this.topError = false;
		const cached = await read<CachedTop>(TOP_KEY);
		if (cached) {
			this.top = cached.stories;
			this.topFrom = cached.fetchedAt;
			this.updatedAt = cached.updatedAt ?? cached.fetchedAt;
		}
		try {
			if (cached && Date.now() - cached.fetchedAt < TOP_TTL) {
				this.topFrom = null;
				return;
			}
			// The hourly file carries the gists; a fresh one is the edition
			// itself, a stale one still lends its gists to the live ranking.
			const file = await fetchEditionFile(`${base}/edition.json`);
			const fresh = file !== null && isFresh(file);
			const stories = fresh ? file.stories : withExtras(await fetchTopOfDay(), file);
			const updatedAt = fresh ? file.builtAt : Date.now();
			this.top = stories;
			this.topFrom = null;
			this.updatedAt = updatedAt;
			await write<CachedTop>(TOP_KEY, { fetchedAt: Date.now(), updatedAt, stories });
		} catch {
			// With a saved copy on screen, `topFrom` already says how old it
			// is; the error state is only for a first visit with no network.
			if (!cached) this.topError = true;
		} finally {
			this.topLoading = false;
		}
	}

	async #loadFact(): Promise<void> {
		this.factLoading = true;
		this.factError = false;
		const today = dateKey(new Date());
		const cached = await read<OnThisDay>(FACT_KEY);
		if (cached) this.fact = cached;
		try {
			if (cached?.date === today) return;
			const fact = await fetchOnThisDay(new Date());
			if (fact) {
				this.fact = fact;
				await write(FACT_KEY, fact);
			}
		} catch {
			if (!cached) this.factError = true;
		} finally {
			this.factLoading = false;
		}
	}
}

/** Storage is a convenience here: if IndexedDB refuses, the page still works. */
async function read<T>(key: string): Promise<T | undefined> {
	try {
		return await db.getDaily<T>(key);
	} catch {
		return undefined;
	}
}

async function write<T>(key: string, value: T): Promise<void> {
	try {
		await db.putDaily(key, $state.snapshot(value));
	} catch {
		// Nothing to tell the reader: they have the fresh copy on screen.
	}
}

export const edition = new Edition();
