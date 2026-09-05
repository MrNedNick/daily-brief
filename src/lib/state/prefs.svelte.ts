import { browser } from '$app/environment';
import { isFeedId, type FeedId } from '../api/types';

export type Theme = 'light' | 'dark';

const KEY = 'daily-brief:prefs';

interface Stored {
	theme?: Theme;
	feed?: FeedId;
}

function read(): Stored {
	if (!browser) return {};
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Stored;
	} catch {
		return {};
	}
}

/**
 * Theme and last-used feed.
 *
 * A plain class with `$state` fields — in Svelte 5 that is all a store needs to
 * be. No `writable`, no `$` prefix, no subscribe: components read `prefs.theme`
 * and the compiler tracks it. Persistence rides along in `$effect.root`, so it
 * is set up once for the lifetime of the app rather than per component.
 */
class Prefs {
	theme = $state<Theme>('dark');
	feed = $state<FeedId>('top');

	constructor() {
		const stored = read();
		if (stored.theme === 'light' || stored.theme === 'dark') this.theme = stored.theme;
		else if (browser && window.matchMedia('(prefers-color-scheme: light)').matches) {
			this.theme = 'light';
		}
		if (isFeedId(stored.feed)) this.feed = stored.feed;

		if (!browser) return;
		$effect.root(() => {
			$effect(() => {
				document.documentElement.dataset.theme = this.theme;
				try {
					localStorage.setItem(KEY, JSON.stringify({ theme: this.theme, feed: this.feed }));
				} catch {
					// Private mode or a full quota: the app keeps working, it just
					// forgets the preference. Not worth interrupting the reader.
				}
			});
		});
	}

	toggleTheme() {
		this.theme = this.theme === 'dark' ? 'light' : 'dark';
	}
}

export const prefs = new Prefs();
