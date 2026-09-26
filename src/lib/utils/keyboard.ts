/**
 * Reading shortcuts. Kept as a pure mapping from a key event to an action so
 * the rules — which keys, and when they must stay out of the way — can be
 * tested without a page.
 */

export type Shortcut = 'next' | 'previous' | 'open' | 'discuss' | 'save' | 'help';

export const SHORTCUTS: { key: string; action: Shortcut; label: string }[] = [
	{ key: 'j', action: 'next', label: 'Next story' },
	{ key: 'k', action: 'previous', label: 'Previous story' },
	{ key: 'o', action: 'open', label: 'Open the story' },
	{ key: 'c', action: 'discuss', label: 'Open the discussion' },
	{ key: 's', action: 'save', label: 'Save or unsave for offline' },
	{ key: '?', action: 'help', label: 'Show these shortcuts' }
];

interface KeyLike {
	key: string;
	altKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
	defaultPrevented?: boolean;
	target: EventTarget | null;
}

/** Somewhere typing happens: a search box, a textarea, an editable region. */
export function isTypingTarget(target: EventTarget | null): boolean {
	if (!target || typeof (target as Element).closest !== 'function') return false;
	const element = target as HTMLElement;
	if (element.isContentEditable) return true;
	return Boolean(element.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
}

export function shortcutFor(event: KeyLike): Shortcut | null {
	if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return null;
	if (isTypingTarget(event.target)) return null;
	return SHORTCUTS.find((item) => item.key === event.key)?.action ?? null;
}

/**
 * The story `step` places away from `current` in document order, or the first
 * one when nothing is selected yet. Stops at the ends instead of wrapping —
 * wrapping from the last feed item back to the edition is disorienting.
 */
export function moveSelection<T>(items: T[], current: T | null, step: 1 | -1): T | null {
	if (!items.length) return null;
	const index = current ? items.indexOf(current) : -1;
	if (index === -1) return step === 1 ? items[0] : null;
	return items[Math.min(items.length - 1, Math.max(0, index + step))];
}
