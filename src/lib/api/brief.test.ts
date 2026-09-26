import { describe, expect, it, vi } from 'vitest';
import {
	FIRST_YEAR,
	dateKey,
	dayWindow,
	fetchOnThisDay,
	fetchTopOfDay,
	yearsToTry
} from './brief';
// Real Algolia responses, trimmed to the fields the app reads.
import topOfDay from './fixtures/top-of-day.json';
import onThisDay2015 from './fixtures/on-this-day-2015.json';
import empty from './fixtures/on-this-day-empty.json';

const json = (body: unknown) =>
	new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

describe('fetchTopOfDay', () => {
	it('asks for stories from the last 24 hours with an encoded filter', async () => {
		const fetchFn = vi.fn(async (_url: string) => json(topOfDay));
		const now = 1_790_000_000_000;
		await fetchTopOfDay(now, undefined, fetchFn as unknown as typeof fetch);
		const url = fetchFn.mock.calls[0][0];
		expect(url).toContain('tags=story');
		expect(url).toContain(`numericFilters=created_at_i%3E${now / 1000 - 86_400}`);
		expect(url).not.toContain('>');
	});

	it('returns seven typed stories, highest score first', async () => {
		const fetchFn = vi.fn(async () => json(topOfDay));
		const stories = await fetchTopOfDay(Date.now(), undefined, fetchFn as unknown as typeof fetch);
		expect(stories).toHaveLength(7);
		for (const story of stories) {
			expect(typeof story.id).toBe('number');
			expect(story.title).toBeTruthy();
			expect(story.score).toBeGreaterThanOrEqual(0);
		}
		const scores = stories.map((s) => s.score);
		expect(scores).toEqual([...scores].sort((a, b) => b - a));
	});
});

describe('yearsToTry', () => {
	it('starts from a year picked by the date and is stable for it', () => {
		expect(yearsToTry('2026-09-26', 2026)).toEqual(yearsToTry('2026-09-26', 2026));
		expect(yearsToTry('2026-09-26', 2026)[0]).not.toBe(undefined);
	});

	it('covers every past year exactly once, never the current one', () => {
		const years = yearsToTry('2026-03-14', 2026);
		expect(new Set(years).size).toBe(years.length);
		expect([...years].sort()).toEqual(
			Array.from({ length: 2026 - FIRST_YEAR }, (_, i) => FIRST_YEAR + i)
		);
	});

	it('walks outwards from the first pick', () => {
		const [first, second, third] = yearsToTry('2026-06-01', 2026);
		expect(Math.abs(second - first)).toBe(1);
		expect(Math.abs(third - first)).toBeLessThanOrEqual(2);
	});
});

describe('dayWindow', () => {
	it('is one UTC day long', () => {
		const [from, to] = dayWindow(2015, 9, 26)!;
		expect(new Date(from * 1000).toISOString()).toBe('2015-09-26T00:00:00.000Z');
		expect(to - from).toBe(86_400);
	});

	it('does not exist for 29 February in a non-leap year', () => {
		expect(dayWindow(2015, 2, 29)).toBeNull();
		expect(dayWindow(2016, 2, 29)).not.toBeNull();
	});
});

describe('fetchOnThisDay', () => {
	it('returns up to three real stories from one past year', async () => {
		const fetchFn = vi.fn(async () => json(onThisDay2015));
		const today = new Date(2026, 8, 26);
		const result = await fetchOnThisDay(today, undefined, fetchFn as unknown as typeof fetch);
		expect(result?.date).toBe(dateKey(today));
		expect(result?.year).toBe(yearsToTry('2026-09-26', 2026)[0]);
		expect(result?.stories.map((s) => s.title)).toContain(
			'Terence Tao solves the Erdős Discrepancy Problem'
		);
		expect(result!.stories.length).toBeLessThanOrEqual(3);
	});

	it('falls through to a neighbouring year when one is empty', async () => {
		let call = 0;
		const fetchFn = vi.fn(async () => json(call++ === 0 ? empty : onThisDay2015));
		const today = new Date(2026, 8, 26);
		const result = await fetchOnThisDay(today, undefined, fetchFn as unknown as typeof fetch);
		const [, second] = yearsToTry('2026-09-26', 2026);
		expect(fetchFn).toHaveBeenCalledTimes(2);
		expect(result?.year).toBe(second);
		expect(result?.stories.length).toBeGreaterThan(0);
	});

	it('returns null only when no year has anything', async () => {
		const fetchFn = vi.fn(async () => json(empty));
		const result = await fetchOnThisDay(new Date(2026, 1, 10), undefined, fetchFn as unknown as typeof fetch);
		expect(result).toBeNull();
	});
});

describe('dateKey', () => {
	it('uses the local calendar date', () => {
		expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
	});
});
