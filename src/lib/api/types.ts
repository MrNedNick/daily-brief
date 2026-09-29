/** Shapes returned by the Hacker News APIs, narrowed to what the app uses. */
import type { StoryExtras } from './edition-file';

export type FeedId = 'top' | 'new' | 'best' | 'show' | 'ask' | 'job';

/** The ranked feeds first, then the sections Hacker News itself keeps. */
export const FEEDS: { id: FeedId; label: string; endpoint: string }[] = [
	{ id: 'top', label: 'Top', endpoint: 'topstories' },
	{ id: 'new', label: 'New', endpoint: 'newstories' },
	{ id: 'best', label: 'Best', endpoint: 'beststories' },
	{ id: 'show', label: 'Show HN', endpoint: 'showstories' },
	{ id: 'ask', label: 'Ask HN', endpoint: 'askstories' },
	{ id: 'job', label: 'Jobs', endpoint: 'jobstories' }
];

export function isFeedId(value: unknown): value is FeedId {
	return FEEDS.some((feed) => feed.id === value);
}

/**
 * A story as the app uses it — the raw item has more fields we ignore. The
 * gist and quote come from the hourly edition file when it has this story.
 */
export interface Story extends StoryExtras {
	id: number;
	/** `story`, `job`, `poll` — or `comment`, when a link points at a reply. */
	type?: string;
	title: string;
	/** Missing on Ask HN and text posts, which link to themselves. */
	url?: string;
	by: string;
	score: number;
	time: number;
	descendants: number;
	/** Self-post body, already HTML. */
	text?: string;
	kids?: number[];
	deleted?: boolean;
	dead?: boolean;
}

export interface Comment {
	id: number;
	by?: string;
	text?: string;
	time: number;
	kids?: number[];
	deleted?: boolean;
	dead?: boolean;
}

/** A story plus its comment tree, as stored for offline reading. */
export interface SavedStory {
	story: Story;
	comments: CommentNode[];
	savedAt: number;
}

export interface CommentNode extends Comment {
	replies: CommentNode[];
}

export interface SearchHit {
	id: number;
	title: string;
	url?: string;
	author: string;
	points: number;
	numComments: number;
	createdAt: number;
}
