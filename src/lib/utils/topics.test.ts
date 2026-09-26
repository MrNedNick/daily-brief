import { describe, expect, it } from 'vitest';
import { filterByTopic, isTopicId, matchesTopic } from './topics';

const story = (title: string, url?: string) => ({ title, url });

describe('matchesTopic', () => {
	it('matches keywords as whole words, case-insensitively', () => {
		expect(matchesTopic(story('Running an LLM on a Raspberry Pi'), 'ai')).toBe(true);
		expect(matchesTopic(story('Why AI agents fail'), 'ai')).toBe(true);
		// "ai" inside another word is not a match.
		expect(matchesTopic(story('Rain in Spain, a travel diary'), 'ai')).toBe(false);
		expect(matchesTopic(story('The painter who never stopped'), 'ai')).toBe(false);
	});

	it('handles keywords with punctuation', () => {
		expect(matchesTopic(story('Modern C++ in 2026'), 'programming')).toBe(true);
		expect(matchesTopic(story('Fine-tuning small models'), 'ai')).toBe(true);
	});

	it('matches by domain, including subdomains', () => {
		expect(matchesTopic(story('A new result', 'https://www.nature.com/articles/x'), 'science')).toBe(true);
		expect(matchesTopic(story('Weekly notes', 'https://blog.github.com/post'), 'programming')).toBe(true);
		// A lookalike domain is not the same site.
		expect(matchesTopic(story('Weekly notes', 'https://notgithub.com/post'), 'programming')).toBe(false);
	});

	it('finds security stories by title', () => {
		expect(matchesTopic(story('Critical vulnerability in OpenSSH'), 'security')).toBe(true);
		expect(matchesTopic(story('How attackers hacked a CI pipeline'), 'security')).toBe(true);
		expect(matchesTopic(story('A history of the pencil'), 'security')).toBe(false);
	});
});

describe('filterByTopic', () => {
	const feed = [story('Rust 2.0 released'), story('Gravity seems holographic'), story('Ransomware hits a hospital')];

	it('keeps only matching stories', () => {
		expect(filterByTopic(feed, 'security').map((s) => s.title)).toEqual(['Ransomware hits a hospital']);
	});

	it('returns the whole feed when the filter is off', () => {
		expect(filterByTopic(feed, null)).toBe(feed);
	});
});

describe('isTopicId', () => {
	it('accepts known topics only', () => {
		expect(isTopicId('ai')).toBe(true);
		expect(isTopicId('sports')).toBe(false);
		expect(isTopicId(null)).toBe(false);
	});
});
