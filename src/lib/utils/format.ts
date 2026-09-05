/** Small pure helpers, kept out of components so they can be tested directly. */

/** `https://blog.example.com/a/b` → `blog.example.com`, with `www.` dropped. */
export function domainOf(url: string | undefined): string | null {
	if (!url) return null;
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return null;
	}
}

const UNITS: [limit: number, seconds: number, name: Intl.RelativeTimeFormatUnit][] = [
	[60, 1, 'second'],
	[3600, 60, 'minute'],
	[86400, 3600, 'hour'],
	[2592000, 86400, 'day'],
	[31536000, 2592000, 'month'],
	[Infinity, 31536000, 'year']
];

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** Unix seconds → "3 hours ago". `now` is injectable so tests are not flaky. */
export function timeAgo(unixSeconds: number, now: number = Date.now()): string {
	const elapsed = Math.max(0, Math.floor(now / 1000) - unixSeconds);
	const [, divisor, unit] = UNITS.find(([limit]) => elapsed < limit) ?? UNITS[UNITS.length - 1];
	return relative.format(-Math.floor(elapsed / divisor), unit);
}

/**
 * Hacker News comment bodies are HTML fragments. They are rendered with
 * `{@html}`, so anything that could execute is stripped first: script and style
 * elements, every `on*` attribute, and non-http(s) URLs such as `javascript:`.
 */
export function sanitizeHtml(html: string | undefined): string {
	if (!html) return '';
	if (typeof DOMParser === 'undefined') return html.replace(/<[^>]*>/g, '');

	const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
	doc.body.querySelectorAll('script, style, iframe, object, embed').forEach((el) => el.remove());

	for (const el of doc.body.querySelectorAll('*')) {
		for (const attr of [...el.attributes]) {
			const name = attr.name.toLowerCase();
			if (name.startsWith('on')) {
				el.removeAttribute(attr.name);
				continue;
			}
			if (name === 'href' || name === 'src') {
				const value = attr.value.trim().toLowerCase();
				if (!value.startsWith('http://') && !value.startsWith('https://')) {
					el.removeAttribute(attr.name);
				}
			}
		}
		if (el.tagName === 'A') {
			el.setAttribute('rel', 'noopener noreferrer nofollow');
			el.setAttribute('target', '_blank');
		}
	}
	return doc.body.innerHTML;
}

/** Plain text from an HTML fragment, for previews and empty-state copy. */
export function stripHtml(html: string | undefined): string {
	if (!html) return '';
	if (typeof DOMParser === 'undefined') return html.replace(/<[^>]*>/g, '');
	const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
	return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Splits `text` around every case-insensitive occurrence of `query`. */
export function highlight(text: string, query: string): { value: string; match: boolean }[] {
	const needle = query.trim();
	if (!needle) return [{ value: text, match: false }];

	const parts: { value: string; match: boolean }[] = [];
	const haystack = text.toLowerCase();
	const lower = needle.toLowerCase();
	let index = 0;

	for (;;) {
		const found = haystack.indexOf(lower, index);
		if (found === -1) break;
		if (found > index) parts.push({ value: text.slice(index, found), match: false });
		parts.push({ value: text.slice(found, found + needle.length), match: true });
		index = found + needle.length;
	}
	if (index < text.length) parts.push({ value: text.slice(index), match: false });
	return parts;
}

/** Total comments in a tree, used for "N replies hidden" on a collapsed branch. */
export function countReplies(nodes: { replies: unknown[] }[]): number {
	return nodes.reduce(
		(total, node) => total + 1 + countReplies(node.replies as { replies: unknown[] }[]),
		0
	);
}
