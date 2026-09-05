import { describe, expect, it } from 'vitest';
import { countReplies, domainOf, highlight, sanitizeHtml, stripHtml, timeAgo } from './format';

describe('domainOf', () => {
	it('strips protocol and www', () => {
		expect(domainOf('https://www.example.com/a/b?c=1')).toBe('example.com');
		expect(domainOf('http://blog.example.co.uk/post')).toBe('blog.example.co.uk');
	});

	it('returns null for self-posts and junk', () => {
		expect(domainOf(undefined)).toBeNull();
		expect(domainOf('not a url')).toBeNull();
	});
});

describe('timeAgo', () => {
	const now = Date.UTC(2026, 0, 10, 12, 0, 0);
	const at = (secondsAgo: number) => Math.floor(now / 1000) - secondsAgo;

	it('describes recent times in the largest fitting unit', () => {
		expect(timeAgo(at(30), now)).toBe('30 seconds ago');
		expect(timeAgo(at(60 * 5), now)).toBe('5 minutes ago');
		expect(timeAgo(at(3600 * 3), now)).toBe('3 hours ago');
		expect(timeAgo(at(86400 * 2), now)).toBe('2 days ago');
	});

	it('never reports a future time for clock skew', () => {
		expect(timeAgo(at(-500), now)).toBe('now');
	});
});

describe('sanitizeHtml', () => {
	it('keeps ordinary markup', () => {
		expect(sanitizeHtml('<p>hello <i>there</i></p>')).toContain('<i>there</i>');
	});

	it('removes scripts and event handlers', () => {
		const dirty = '<p onclick="steal()">hi</p><script>steal()</script>';
		const clean = sanitizeHtml(dirty);
		expect(clean).not.toContain('script');
		expect(clean).not.toContain('onclick');
		expect(clean).toContain('hi');
	});

	it('drops javascript: URLs but keeps http links', () => {
		expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:');
		const safe = sanitizeHtml('<a href="https://example.com">x</a>');
		expect(safe).toContain('https://example.com');
		expect(safe).toContain('noopener');
	});
});

describe('stripHtml', () => {
	it('returns collapsed plain text', () => {
		expect(stripHtml('<p>one</p>\n<p>  two </p>')).toBe('one two');
	});
});

describe('highlight', () => {
	it('marks every case-insensitive occurrence', () => {
		expect(highlight('Rust and rust', 'rust')).toEqual([
			{ value: 'Rust', match: true },
			{ value: ' and ', match: false },
			{ value: 'rust', match: true }
		]);
	});

	it('returns one unmatched chunk when the query is empty', () => {
		expect(highlight('anything', '  ')).toEqual([{ value: 'anything', match: false }]);
	});
});

describe('countReplies', () => {
	it('counts a nested tree, not just direct children', () => {
		const tree = [
			{ replies: [{ replies: [] }, { replies: [{ replies: [] }] }] },
			{ replies: [] }
		];
		expect(countReplies(tree)).toBe(5);
	});
});
