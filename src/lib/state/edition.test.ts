import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';

vi.mock('$app/environment', () => ({ browser: true }));

const store = new Map<string, unknown>();
vi.mock('../db', () => ({
	getDaily: vi.fn(async (key: string) => store.get(key)),
	putDaily: vi.fn(async (key: string, value: unknown) => void store.set(key, value))
}));

const network = { up: true };
const prebuilt: { file: unknown } = { file: null };
vi.mock('../api/brief', async (original) => {
	const actual = await original<typeof import('../api/brief')>();
	const story = { id: 1, title: 'Fresh', by: 'a', score: 9, time: 1, descendants: 0 };
	return {
		...actual,
		fetchEditionFile: vi.fn(async () => prebuilt.file),
		fetchTopOfDay: vi.fn(async () => {
			if (!network.up) throw new Error('offline');
			return [story];
		}),
		fetchOnThisDay: vi.fn(async (today: Date) => {
			if (!network.up) throw new Error('offline');
			return { date: actual.dateKey(today), year: 2015, stories: [story] };
		})
	};
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function freshEdition() {
	vi.resetModules();
	const { edition } = await import('./edition.svelte');
	edition.load();
	await settle();
	await settle();
	flushSync();
	return edition;
}

describe('edition', () => {
	beforeEach(() => {
		store.clear();
		network.up = true;
		prebuilt.file = null;
	});

	it('uses a fresh hourly edition as it is, gists included', async () => {
		const builtAt = Date.now() - 60_000;
		prebuilt.file = {
			version: 1,
			builtAt,
			stories: [{ id: 7, title: 'Prebuilt', by: 'p', score: 50, time: 1, descendants: 3, gist: 'What it is about' }]
		};
		const edition = await freshEdition();
		expect(edition.top.map((s) => s.gist)).toEqual(['What it is about']);
		expect(edition.updatedAt).toBe(builtAt);
	});

	it('with a stale hourly edition, ranks live and still borrows its gists', async () => {
		prebuilt.file = {
			version: 1,
			builtAt: 0,
			stories: [{ id: 1, title: 'Old ranking', by: 'a', score: 1, time: 1, descendants: 0, gist: 'Still true' }]
		};
		const edition = await freshEdition();
		expect(edition.top).toMatchObject([{ title: 'Fresh', gist: 'Still true' }]);
	});

	it('fetches both parts and keeps them for later', async () => {
		const edition = await freshEdition();
		expect(edition.top.map((s) => s.title)).toEqual(['Fresh']);
		expect(edition.fact?.year).toBe(2015);
		expect(store.has('top-of-day')).toBe(true);
		expect(store.has('on-this-day')).toBe(true);
	});

	it('offline, shows the last saved fact with its own date instead of an error', async () => {
		const yesterday = { date: '2000-01-01', year: 2010, stories: [{ id: 2, title: 'Old', by: 'b', score: 5, time: 1, descendants: 0 }] };
		store.set('on-this-day', yesterday);
		store.set('top-of-day', { fetchedAt: 0, stories: [{ id: 3, title: 'Saved', by: 'c', score: 1, time: 1, descendants: 0 }] });
		network.up = false;

		const edition = await freshEdition();
		expect(edition.fact).toEqual(yesterday);
		expect(edition.factError).toBe(false);
		expect(edition.top.map((s) => s.title)).toEqual(['Saved']);
		expect(edition.topFrom).toBe(0);
		expect(edition.topError).toBe(false);
	});

	it('offline on a first visit, says so', async () => {
		network.up = false;
		const edition = await freshEdition();
		expect(edition.topError).toBe(true);
		expect(edition.factError).toBe(true);
	});
});
