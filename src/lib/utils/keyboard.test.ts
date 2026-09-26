import { describe, expect, it } from 'vitest';
import { moveSelection, shortcutFor } from './keyboard';

const press = (key: string, target: EventTarget | null = document.body, extra = {}) => ({
	key,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
	target,
	...extra
});

describe('shortcutFor', () => {
	it('maps the reading keys', () => {
		expect(shortcutFor(press('j'))).toBe('next');
		expect(shortcutFor(press('k'))).toBe('previous');
		expect(shortcutFor(press('o'))).toBe('open');
		expect(shortcutFor(press('c'))).toBe('discuss');
		expect(shortcutFor(press('s'))).toBe('save');
		expect(shortcutFor(press('?'))).toBe('help');
		expect(shortcutFor(press('x'))).toBeNull();
	});

	it('stays out of the way while typing in the search box', () => {
		const input = document.createElement('input');
		document.body.append(input);
		expect(shortcutFor(press('j', input))).toBeNull();
		const textarea = document.createElement('textarea');
		expect(shortcutFor(press('s', textarea))).toBeNull();
	});

	it('leaves browser shortcuts alone', () => {
		expect(shortcutFor(press('s', document.body, { metaKey: true }))).toBeNull();
		expect(shortcutFor(press('c', document.body, { ctrlKey: true }))).toBeNull();
	});
});

describe('moveSelection', () => {
	const items = ['a', 'b', 'c'];

	it('starts at the first story', () => {
		expect(moveSelection(items, null, 1)).toBe('a');
	});

	it('moves and stops at both ends', () => {
		expect(moveSelection(items, 'a', 1)).toBe('b');
		expect(moveSelection(items, 'c', 1)).toBe('c');
		expect(moveSelection(items, 'a', -1)).toBe('a');
	});
});
