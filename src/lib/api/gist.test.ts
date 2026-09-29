import { describe, expect, it } from 'vitest';
import { clamp, decodeEntities, gistFromHtml, gistFromPost, GIST_LIMIT, quoteFromComment, QUOTE_LIMIT } from './gist';

const page = (meta: string) => `<!doctype html><html><head><title>x</title>${meta}</head><body><p>Menu</p></body></html>`;

describe('gistFromHtml', () => {
	it('takes og:description first', () => {
		const html = page(
			`<meta name="description" content="Plain description that is long enough to count here.">
			 <meta property="og:description" content="Claude Sonnet 5.5 is a clear upgrade over Claude Sonnet 5, runs 30% faster.">`
		);
		expect(gistFromHtml(html)).toBe('Claude Sonnet 5.5 is a clear upgrade over Claude Sonnet 5, runs 30% faster.');
	});

	it('reads content before the name attribute too', () => {
		const html = page(`<meta content='A freedom of information request finds the trial cost &#xA3;320,000.' name='description'>`);
		expect(gistFromHtml(html)).toBe('A freedom of information request finds the trial cost £320,000.');
	});

	it('skips slogans and descriptions that only repeat the headline', () => {
		expect(gistFromHtml(page(`<meta property="og:description" content="The long way around.">`))).toBeNull();
		const same = page(`<meta property="og:description" content="Kids turned NPR Spotify comments into a social network">`);
		expect(gistFromHtml(same, 'Kids turned NPR Spotify comments into a social network')).toBeNull();
	});

	it('returns null when the page has no description', () => {
		expect(gistFromHtml(page(''))).toBeNull();
	});

	it('never goes over the limit and ends on a whole word', () => {
		const long = 'word '.repeat(200);
		const gist = gistFromHtml(page(`<meta property="og:description" content="${long}">`))!;
		expect(gist.length).toBeLessThanOrEqual(GIST_LIMIT);
		expect(gist.endsWith('word…')).toBe(true);
	});
});

describe('gistFromPost', () => {
	it('turns an Ask HN body into plain text', () => {
		expect(gistFromPost('Hi HN, I&#x27;m Per.<p>We spent the last year building a video index of every post.')).toBe(
			"Hi HN, I'm Per. We spent the last year building a video index of every post."
		);
	});

	it('ignores empty and very short bodies', () => {
		expect(gistFromPost(undefined)).toBeNull();
		expect(gistFromPost('Title says it all')).toBeNull();
	});
});

describe('quoteFromComment', () => {
	it('drops quoted lines and bare links', () => {
		const html = '&gt; The original claim<p>https://example.com/a<p>I think the real issue is the cost of maintaining it.';
		expect(quoteFromComment(html)).toBe('I think the real issue is the cost of maintaining it.');
	});

	it('keeps quotes short', () => {
		expect(quoteFromComment('long sentence '.repeat(40))!.length).toBeLessThanOrEqual(QUOTE_LIMIT);
	});

	it('drops the reply\'s own wrapping quotation marks', () => {
		expect(quoteFromComment('&quot;We are demolishing more and more homes, they have nowhere to return.&quot;')).toBe(
			'We are demolishing more and more homes, they have nowhere to return.'
		);
	});

	it('returns null for one-word replies', () => {
		expect(quoteFromComment('Agreed.')).toBeNull();
	});
});

describe('helpers', () => {
	it('decodes named and numeric entities', () => {
		expect(decodeEntities('A &amp; B &#039;c&#039; &rsquo;d&hellip; &#x1F600;')).toBe("A & B 'c' ’d… 😀");
	});

	it('leaves short text alone', () => {
		expect(clamp('short', 10)).toBe('short');
	});
});
