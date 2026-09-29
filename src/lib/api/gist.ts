/**
 * The two-line "what is this about" under each headline, taken from what the
 * article already says about itself — its `og:description` or
 * `meta description` — and one line from the discussion.
 *
 * No dependencies and no DOM: the same functions run in the browser tests and
 * in the hourly job that builds `edition.json` on Node.
 */

export const GIST_LIMIT = 300;
export const QUOTE_LIMIT = 200;
/** Shorter than this, a description is a site slogan, not a summary. */
const MIN_GIST = 40;

const NAMED: Record<string, string> = {
	amp: '&',
	quot: '"',
	apos: "'",
	lt: '<',
	gt: '>',
	nbsp: ' ',
	hellip: '…',
	mdash: '—',
	ndash: '–',
	rsquo: '’',
	lsquo: '‘',
	rdquo: '”',
	ldquo: '“',
	pound: '£',
	euro: '€'
};

export function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
		if (code[0] === '#') {
			const value = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
			return Number.isFinite(value) && value > 0 ? String.fromCodePoint(value) : match;
		}
		return NAMED[code.toLowerCase()] ?? match;
	});
}

/** Tags out, entities decoded, whitespace collapsed. */
export function toPlainText(html: string): string {
	const text = html
		.replace(/<(p|br|li)\b[^>]*>/gi, ' ')
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ');
	return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

/** Cut at a word boundary and mark the cut, so a sentence never ends mid-word. */
export function clamp(text: string, limit: number): string {
	if (text.length <= limit) return text;
	const cut = text.slice(0, limit - 1);
	const space = cut.lastIndexOf(' ');
	return `${(space > limit * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, '')}…`;
}

const META_NAMES = ['og:description', 'twitter:description', 'description'];

/** Every `<meta>` tag's name/property and content, in document order. */
function metaTags(html: string): Map<string, string> {
	const found = new Map<string, string>();
	for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
		const key = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
		const content = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
		const value = content?.[1] ?? content?.[2];
		if (key && value && !found.has(key)) found.set(key, value);
	}
	return found;
}

/**
 * The article's own summary, or null. Only the head is read — descriptions
 * live there, and a 5 MB page should not be scanned to the end.
 */
export function gistFromHtml(html: string, title = ''): string | null {
	const head = html.slice(0, 200_000);
	const tags = metaTags(head);
	for (const name of META_NAMES) {
		const raw = tags.get(name);
		if (!raw) continue;
		const text = toPlainText(raw);
		if (text.length < MIN_GIST) continue;
		// A description that only repeats the headline explains nothing.
		if (title && text.toLowerCase().replace(/\W/g, '') === title.toLowerCase().replace(/\W/g, '')) continue;
		return clamp(text, GIST_LIMIT);
	}
	return null;
}

/** Ask HN / Show HN posts carry their own text — that is the best summary there is. */
export function gistFromPost(html: string | undefined | null): string | null {
	if (!html) return null;
	const text = toPlainText(html);
	return text.length >= MIN_GIST ? clamp(text, GIST_LIMIT) : null;
}

/**
 * One line from the discussion. Quoted replies (`> …`) and bare links are
 * skipped: the point is to show what people think, not what they quote.
 */
export function quoteFromComment(html: string | undefined | null): string | null {
	if (!html) return null;
	const paragraphs = html
		.split(/<p\b[^>]*>/i)
		.map(toPlainText)
		.filter((text) => text.length > 0 && !text.startsWith('>') && !/^https?:\/\/\S+$/.test(text));
	// The card wraps the line in its own quotation marks.
	const text = paragraphs.join(' ').trim().replace(/^["“”«]+|["“”»]+$/g, '').trim();
	return text.length >= 30 ? clamp(text, QUOTE_LIMIT) : null;
}
