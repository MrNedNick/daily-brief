import { SvelteSet } from 'svelte/reactivity';
import { browser } from '$app/environment';
import { fetchCommentTree, fetchItem } from '../api/hn';
import * as db from '../db';
import type { SavedStory, Story } from '../api/types';

/**
 * Saved stories and read marks.
 *
 * IndexedDB is the source of truth; this class holds the mirror the UI reads
 * from, so a bookmark button can flip instantly instead of waiting on a
 * transaction.
 */
class Library {
	/**
	 * `SvelteSet`, not `$state(new Set())`: runes proxy plain objects and
	 * arrays, so a bare Set updates on reassignment but not on `.add()` —
	 * which is exactly how a bookmark button silently stops re-rendering.
	 */
	savedIds = new SvelteSet<number>();
	readIds = new SvelteSet<number>();
	saved = $state<SavedStory[]>([]);
	ready = $state(false);
	/** Storage refused to open — the UI says so instead of spinning forever. */
	failed = $state(false);
	/** Held while a save is fetching the comment tree, keyed by story id. */
	pending = new SvelteSet<number>();

	async init(): Promise<void> {
		if (!browser || this.ready) return;
		try {
			const [savedIds, readIds] = await Promise.all([db.listSavedIds(), db.listReadIds()]);
			for (const id of savedIds) this.savedIds.add(id);
			for (const id of readIds) this.readIds.add(id);
			this.ready = true;
		} catch {
			this.failed = true;
		}
	}

	async refreshSaved(): Promise<void> {
		try {
			this.saved = await db.listSavedStories();
			this.savedIds.clear();
			for (const entry of this.saved) this.savedIds.add(entry.story.id);
			this.ready = true;
			this.failed = false;
		} catch {
			this.failed = true;
		}
	}

	isSaved(id: number): boolean {
		return this.savedIds.has(id);
	}

	isRead(id: number): boolean {
		return this.readIds.has(id);
	}

	async markRead(id: number): Promise<void> {
		if (this.readIds.has(id)) return;
		this.readIds.add(id);
		await db.markRead(id);
	}

	/**
	 * Saving pulls the comment tree too — that is the difference between a
	 * bookmark and something you can actually read on a plane.
	 */
	async save(story: Story): Promise<void> {
		if (this.pending.has(story.id)) return;
		this.pending.add(story.id);
		try {
			const comments = story.kids?.length ? await fetchCommentTree(story.kids) : [];
			const entry = await db.saveStory(plain(story), comments);
			this.savedIds.add(story.id);
			this.saved = [entry, ...this.saved.filter((item) => item.story.id !== story.id)];
		} finally {
			this.pending.delete(story.id);
		}
	}

	async remove(id: number): Promise<void> {
		await db.unsaveStory(id);
		this.savedIds.delete(id);
		this.saved = this.saved.filter((entry) => entry.story.id !== id);
	}

	async toggle(story: Story): Promise<void> {
		if (this.isSaved(story.id)) await this.remove(story.id);
		else await this.save(story);
	}

	/**
	 * A story with its comments, from the network when possible and from
	 * IndexedDB when not. Offline, a saved story opens in full; an unsaved one
	 * throws so the page can say why instead of rendering an empty shell.
	 */
	async open(id: number): Promise<{ story: Story; comments: SavedStory['comments']; offline: boolean }> {
		const cached = await db.getSavedStory(id);
		if (browser && !navigator.onLine) {
			if (!cached) throw new Error('offline-unsaved');
			return { story: cached.story, comments: cached.comments, offline: true };
		}
		try {
			const story = await fetchItem<Story>(id);
			if (!story) throw new Error('not-found');
			const comments = story.kids?.length ? await fetchCommentTree(story.kids) : [];
			// Keep an already-saved copy current while the reader is online.
			if (cached) await db.saveStory(plain(story), comments);
			return { story, comments, offline: false };
		} catch (error) {
			if (cached) return { story: cached.story, comments: cached.comments, offline: true };
			throw error;
		}
	}
}

/**
 * Reactive state is a Proxy, and IndexedDB stores values with the structured
 * clone algorithm, which refuses to clone a Proxy — the write fails with
 * `DataCloneError`. Anything crossing out of the app into storage has to be
 * snapshotted first.
 */
function plain<T>(value: T): T {
	return $state.snapshot(value) as T;
}

export const library = new Library();
