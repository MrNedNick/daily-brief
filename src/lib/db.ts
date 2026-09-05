import { openDB, type IDBPDatabase } from 'idb';
import { browser } from '$app/environment';
import type { CommentNode, SavedStory, Story } from './api/types';

/**
 * Everything the app keeps between visits lives here: saved stories with their
 * comment tree (so they open with no network at all) and the ids already read.
 * `localStorage` would not hold a comment tree; IndexedDB does, and idb keeps
 * it to a promise API instead of event handlers.
 */

const DB_NAME = 'daily-brief';
const DB_VERSION = 1;
const SAVED = 'saved';
const READ = 'read';

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
	if (!browser) throw new Error('IndexedDB is only available in the browser');
	dbPromise ??= openDB(DB_NAME, DB_VERSION, {
		upgrade(database) {
			if (!database.objectStoreNames.contains(SAVED)) {
				database.createObjectStore(SAVED, { keyPath: 'story.id' });
			}
			if (!database.objectStoreNames.contains(READ)) {
				database.createObjectStore(READ);
			}
		},
		// Another tab wants to upgrade or delete the database and cannot while
		// this connection is open. Letting go is the only way it ever finishes;
		// the next call reopens. Without this, one stale tab hangs every other
		// tab's library forever, with no error to show for it.
		blocking() {
			dbPromise?.then((database) => database.close()).catch(() => {});
			dbPromise = null;
		}
	});
	return dbPromise;
}

export async function saveStory(story: Story, comments: CommentNode[]): Promise<SavedStory> {
	const entry: SavedStory = { story, comments, savedAt: Date.now() };
	await (await db()).put(SAVED, entry);
	return entry;
}

export async function unsaveStory(id: number): Promise<void> {
	await (await db()).delete(SAVED, id);
}

export async function getSavedStory(id: number): Promise<SavedStory | undefined> {
	return (await db()).get(SAVED, id);
}

/** Newest save first — the list reads as a reading queue, not a database dump. */
export async function listSavedStories(): Promise<SavedStory[]> {
	const all: SavedStory[] = await (await db()).getAll(SAVED);
	return all.sort((a, b) => b.savedAt - a.savedAt);
}

export async function listSavedIds(): Promise<number[]> {
	const keys = await (await db()).getAllKeys(SAVED);
	return keys.map(Number);
}

export async function markRead(id: number): Promise<void> {
	await (await db()).put(READ, Date.now(), id);
}

export async function listReadIds(): Promise<number[]> {
	const keys = await (await db()).getAllKeys(READ);
	return keys.map(Number);
}
