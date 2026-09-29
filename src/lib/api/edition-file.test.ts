import { describe, expect, it } from 'vitest';
import { EDITION_MAX_AGE, isFresh, parseEdition, withExtras } from './edition-file';

const story = { id: 1, title: 'A', by: 'x', score: 10, time: 0, descendants: 0 };

describe('parseEdition', () => {
	it('accepts a valid file', () => {
		const file = parseEdition({ version: 1, builtAt: 5, stories: [{ ...story, gist: 'g', quote: { by: 'y', text: 't' } }] });
		expect(file?.stories[0].gist).toBe('g');
	});

	it('treats another version, a broken shape or an empty list as absent', () => {
		expect(parseEdition({ version: 2, builtAt: 5, stories: [story] })).toBeNull();
		expect(parseEdition({ version: 1, stories: [story] })).toBeNull();
		expect(parseEdition({ version: 1, builtAt: 5, stories: [{ id: 'x' }] })).toBeNull();
		expect(parseEdition(null)).toBeNull();
	});
});

describe('isFresh', () => {
	const now = 10 * EDITION_MAX_AGE;
	it('is fresh within the window and stale after it', () => {
		expect(isFresh({ version: 1, builtAt: now - 1000, stories: [] }, now)).toBe(true);
		expect(isFresh({ version: 1, builtAt: now - EDITION_MAX_AGE - 1, stories: [] }, now)).toBe(false);
	});
});

describe('withExtras', () => {
	it('adds gists to live stories by id and leaves the rest untouched', () => {
		const file = { version: 1, builtAt: 0, stories: [{ ...story, gist: 'What it is', quote: { by: 'y', text: 'Said' } }] };
		const [first, second] = withExtras([{ ...story, score: 99 }, { ...story, id: 2 }], file);
		expect(first).toMatchObject({ score: 99, gist: 'What it is', quote: { by: 'y', text: 'Said' } });
		expect(second).not.toHaveProperty('gist');
	});

	it('returns the stories as they are without a file', () => {
		const stories = [story];
		expect(withExtras(stories, null)).toBe(stories);
	});
});
