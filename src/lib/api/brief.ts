import { ALGOLIA, getJson, type AlgoliaHit, type AlgoliaResponse, type Fetch } from './hn';
import type { Story } from './types';

/**
 * The two things the front page is built around, both from the Algolia index
 * of Hacker News: the biggest stories of the last 24 hours, and a real story
 * from this calendar date in an earlier year.
 */

const DAY = 86_400;
/** Hacker News opened on 19 February 2007; there is nothing before it. */
export const FIRST_YEAR = 2007;
/** Enough points to have mattered at the time, low enough for 2007. */
const MIN_POINTS = 20;

export const EDITION_SIZE = 7;

/** An Algolia hit in the shape the rest of the app already renders. */
export function hitToStory(hit: AlgoliaHit): Story {
	return {
		id: Number(hit.objectID),
		type: 'story',
		title: hit.title ?? '',
		url: hit.url ?? undefined,
		by: hit.author,
		score: hit.points ?? 0,
		time: hit.created_at_i,
		descendants: hit.num_comments ?? 0
	};
}

function toStories(data: AlgoliaResponse): Story[] {
	return data.hits
		.filter((hit) => hit.title)
		.map(hitToStory)
		.sort((a, b) => b.score - a.score);
}

/**
 * The most-upvoted stories posted in the last 24 hours. `search` with an empty
 * query ranks by points already; the sort is kept anyway so the edition never
 * depends on how the index happens to tie-break.
 *
 * The comparison operator is percent-encoded on purpose: a raw `>` in the
 * query string is rejected with a 400 before it reaches Algolia.
 */
export async function fetchTopOfDay(
	now: number = Date.now(),
	signal?: AbortSignal,
	fetchFn?: Fetch
): Promise<Story[]> {
	const since = Math.floor(now / 1000) - DAY;
	const url = `${ALGOLIA}/search?tags=story&hitsPerPage=${EDITION_SIZE}&numericFilters=${encodeURIComponent(`created_at_i>${since}`)}`;
	return toStories(await getJson<AlgoliaResponse>(url, signal, fetchFn)).slice(0, EDITION_SIZE);
}

/** `2026-09-26` for the reader's own calendar day, not UTC's. */
export function dateKey(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A small, stable string hash — the same date always lands on the same year. */
function hash(text: string): number {
	let value = 2166136261;
	for (const char of text) {
		value ^= char.charCodeAt(0);
		value = Math.imul(value, 16777619);
	}
	return value >>> 0;
}

/**
 * Past years to try for `key`, best first: one picked from the date, then its
 * neighbours outwards (+1, −1, +2, −2 …). An empty year — a date before HN
 * existed, or 29 February in a non-leap year — just falls through to the next.
 */
export function yearsToTry(key: string, currentYear: number): number[] {
	const last = currentYear - 1;
	const span = last - FIRST_YEAR + 1;
	if (span <= 0) return [];
	const start = FIRST_YEAR + (hash(key) % span);
	const years = [start];
	for (let step = 1; years.length < span; step++) {
		if (start + step <= last) years.push(start + step);
		if (start - step >= FIRST_YEAR) years.push(start - step);
	}
	return years;
}

/** Unix-second bounds of `month`/`day` in `year` (UTC), or null if it does not exist. */
export function dayWindow(year: number, month: number, day: number): [number, number] | null {
	const start = new Date(Date.UTC(year, month - 1, day));
	if (start.getUTCMonth() !== month - 1) return null;
	const from = start.getTime() / 1000;
	return [from, from + DAY];
}

export interface OnThisDay {
	/** The reader's date this card is for, `YYYY-MM-DD`. */
	date: string;
	year: number;
	/** 1–3 real stories from that day, highest-scoring first. */
	stories: Story[];
}

/**
 * "On this day N years ago on Hacker News". Walks `yearsToTry` until a year
 * has stories, so the card never comes back empty for a date that has any
 * history at all. Returns null only when no past year does.
 */
export async function fetchOnThisDay(
	today: Date = new Date(),
	signal?: AbortSignal,
	fetchFn?: Fetch
): Promise<OnThisDay | null> {
	const key = dateKey(today);
	const [, month, day] = key.split('-').map(Number);

	for (const year of yearsToTry(key, today.getFullYear())) {
		const window = dayWindow(year, month, day);
		if (!window) continue;
		const filters = `created_at_i>=${window[0]},created_at_i<${window[1]},points>=${MIN_POINTS}`;
		const url = `${ALGOLIA}/search?tags=story&hitsPerPage=3&numericFilters=${encodeURIComponent(filters)}`;
		const stories = toStories(await getJson<AlgoliaResponse>(url, signal, fetchFn));
		if (stories.length) return { date: key, year, stories };
	}
	return null;
}
