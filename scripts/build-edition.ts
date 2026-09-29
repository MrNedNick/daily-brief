/**
 * Builds `static/edition.json`: the biggest Hacker News stories of the last
 * 24 hours, each with a two-line gist and one line from its discussion.
 *
 * Runs every hour in CI before the site is built, on Node 22 with type
 * stripping — no bundler, no API keys, no paid services:
 *
 *   node --experimental-strip-types scripts/build-edition.ts [output]
 *
 * It never fails the deploy. One article that times out just has no gist.
 * If Hacker News search itself is down, the edition that is live right now is
 * carried over, and if even that is gone the file is simply not written — the
 * app then loads the stories live, as it always could.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { EDITION_SIZE, EDITION_VERSION, parseEdition } from '../src/lib/api/edition-file.ts';
import type { EditionFile, EditionStory, Quote } from '../src/lib/api/edition-file.ts';
import { gistFromHtml, gistFromPost, quoteFromComment } from '../src/lib/api/gist.ts';

const ALGOLIA = 'https://hn.algolia.com/api/v1';
const FIREBASE = 'https://hacker-news.firebaseio.com/v0';
const LIVE_EDITION = 'https://mrnednick.github.io/daily-brief/edition.json';
const DAY = 86_400;
/** Descriptions are in the head; there is no reason to download a whole page. */
const MAX_BYTES = 300_000;
const TIMEOUT = 6_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; DailyBrief/1.0; +https://mrnednick.github.io/daily-brief/)';

const output = process.argv[2] ?? 'static/edition.json';

interface Hit {
	objectID: string;
	title: string | null;
	url: string | null;
	author: string;
	points: number | null;
	created_at_i: number;
	num_comments: number | null;
	story_text: string | null;
}

interface Item {
	by?: string;
	text?: string;
	kids?: number[];
	deleted?: boolean;
	dead?: boolean;
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT);
	try {
		return await run(controller.signal);
	} finally {
		clearTimeout(timer);
	}
}

async function json<T>(url: string): Promise<T> {
	return withTimeout(async (signal) => {
		const response = await fetch(url, { signal });
		if (!response.ok) throw new Error(`${response.status} ${url}`);
		return (await response.json()) as T;
	});
}

/** The first few hundred kilobytes of an HTML page, or null for anything else. */
async function head(url: string): Promise<string | null> {
	return withTimeout(async (signal) => {
		const response = await fetch(url, { signal, headers: { 'user-agent': USER_AGENT, accept: 'text/html' } });
		if (!response.ok || !response.body) return null;
		if (!(response.headers.get('content-type') ?? '').includes('html')) return null;
		const reader = response.body.getReader();
		const chunks: Uint8Array[] = [];
		let size = 0;
		while (size < MAX_BYTES) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
			size += value.length;
		}
		await reader.cancel().catch(() => {});
		return new TextDecoder().decode(Buffer.concat(chunks));
	});
}

async function topOfDay(): Promise<Hit[]> {
	const since = Math.floor(Date.now() / 1000) - DAY;
	const filter = encodeURIComponent(`created_at_i>${since}`);
	const data = await json<{ hits: Hit[] }>(`${ALGOLIA}/search?tags=story&hitsPerPage=${EDITION_SIZE}&numericFilters=${filter}`);
	return data.hits.filter((hit) => hit.title).sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
}

async function gistFor(hit: Hit): Promise<string | undefined> {
	const own = gistFromPost(hit.story_text);
	if (own) return own;
	if (!hit.url) return undefined;
	try {
		const html = await head(hit.url);
		return (html && gistFromHtml(html, hit.title ?? '')) || undefined;
	} catch {
		return undefined;
	}
}

/** The first top-level reply that says something in its own words. */
async function quoteFor(id: number): Promise<Quote | undefined> {
	try {
		const story = await json<Item | null>(`${FIREBASE}/item/${id}.json`);
		for (const kid of story?.kids?.slice(0, 4) ?? []) {
			const comment = await json<Item | null>(`${FIREBASE}/item/${kid}.json`);
			if (!comment || comment.deleted || comment.dead || !comment.by) continue;
			const text = quoteFromComment(comment.text);
			if (text) return { by: comment.by, text };
		}
	} catch {
		// No quote is fine; the card just shows the headline and the gist.
	}
	return undefined;
}

async function build(): Promise<EditionFile> {
	const hits = await topOfDay();
	const stories = await Promise.all(
		hits.map(async (hit): Promise<EditionStory> => {
			const [gist, quote] = await Promise.all([gistFor(hit), quoteFor(Number(hit.objectID))]);
			return {
				id: Number(hit.objectID),
				title: hit.title ?? '',
				...(hit.url ? { url: hit.url } : {}),
				by: hit.author,
				score: hit.points ?? 0,
				time: hit.created_at_i,
				descendants: hit.num_comments ?? 0,
				...(gist ? { gist } : {}),
				...(quote ? { quote } : {})
			};
		})
	);
	return { version: EDITION_VERSION, builtAt: Date.now(), stories };
}

async function save(file: EditionFile): Promise<void> {
	await mkdir(dirname(output), { recursive: true });
	await writeFile(output, JSON.stringify(file));
}

try {
	const file = await build();
	await save(file);
	const gists = file.stories.filter((story) => story.gist).length;
	const quotes = file.stories.filter((story) => story.quote).length;
	console.log(`edition: ${file.stories.length} stories, ${gists} with a gist, ${quotes} with a quote → ${output}`);
} catch (error) {
	console.warn(`edition: Hacker News search failed (${(error as Error).message}); keeping the live edition`);
	try {
		const live = parseEdition(await json<unknown>(LIVE_EDITION));
		if (live) {
			await save(live);
			console.log(`edition: carried over the edition built ${new Date(live.builtAt).toISOString()}`);
		}
	} catch {
		console.warn('edition: no live edition either; the app will load stories live');
	}
}
