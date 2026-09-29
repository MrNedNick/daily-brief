/**
 * `edition.json` — the prebuilt edition the hourly job publishes next to the
 * app: today's top stories with a gist and a line from the discussion each.
 *
 * The app never depends on it. A missing, broken or stale file falls back to
 * the live Hacker News search, as the app did before the file existed; the
 * gists it does have are still matched to live stories by id.
 *
 * No imports on purpose: the build job runs this file directly on Node.
 */

export const EDITION_SIZE = 9;
export const EDITION_VERSION = 1;
/** Older than this, the file's ranking is out of date; its gists are not. */
export const EDITION_MAX_AGE = 3 * 60 * 60 * 1000;

export interface Quote {
	by: string;
	text: string;
}

/** The part of a story the file adds on top of what Hacker News returns. */
export interface StoryExtras {
	gist?: string;
	quote?: Quote;
}

export interface EditionStory extends StoryExtras {
	id: number;
	title: string;
	url?: string;
	by: string;
	score: number;
	time: number;
	descendants: number;
}

export interface EditionFile {
	version: number;
	/** When the job built it, ms since epoch. */
	builtAt: number;
	stories: EditionStory[];
}

function isQuote(value: unknown): value is Quote {
	const quote = value as Quote;
	return Boolean(quote) && typeof quote.by === 'string' && typeof quote.text === 'string';
}

function isStory(value: unknown): value is EditionStory {
	const story = value as EditionStory;
	return (
		Boolean(story) &&
		typeof story.id === 'number' &&
		typeof story.title === 'string' &&
		typeof story.score === 'number' &&
		(story.gist === undefined || typeof story.gist === 'string') &&
		(story.quote === undefined || isQuote(story.quote))
	);
}

/** A file from another version or a half-written upload is treated as absent. */
export function parseEdition(value: unknown): EditionFile | null {
	const file = value as EditionFile;
	if (!file || file.version !== EDITION_VERSION || typeof file.builtAt !== 'number') return null;
	if (!Array.isArray(file.stories)) return null;
	const stories = file.stories.filter(isStory);
	return stories.length ? { version: file.version, builtAt: file.builtAt, stories } : null;
}

export function isFresh(file: EditionFile, now: number = Date.now()): boolean {
	return now - file.builtAt < EDITION_MAX_AGE && file.builtAt <= now + 60_000;
}

/** Live stories, each with the gist and quote the file has for the same id. */
export function withExtras<T extends { id: number }>(stories: T[], file: EditionFile | null): (T & StoryExtras)[] {
	if (!file) return stories;
	const extras = new Map(file.stories.map((story) => [story.id, story]));
	return stories.map((story) => {
		const found = extras.get(story.id);
		if (!found) return story;
		return {
			...story,
			...(found.gist ? { gist: found.gist } : {}),
			...(found.quote ? { quote: found.quote } : {})
		};
	});
}
