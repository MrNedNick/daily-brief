<script lang="ts">
	import { base } from '$app/paths';
	import '../app.css';
	import { page } from '$app/state';
	import { prefs } from '$lib/state/prefs.svelte';
	import { library } from '$lib/state/library.svelte';
	import { goto } from '$app/navigation';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ShortcutsDialog from '$lib/components/ShortcutsDialog.svelte';
	import { moveSelection, shortcutFor } from '$lib/utils/keyboard';

	let { children } = $props();

	// One load of the saved/read ids for the whole app, not per page.
	$effect(() => {
		library.init();
	});

	const onToday = $derived(page.url.pathname === `${base}/`);
	const savedCount = $derived(library.savedIds.size);

	let shortcuts = $state<ReturnType<typeof ShortcutsDialog> | null>(null);

	/**
	 * j/k walk every story on the page in reading order — the edition, then
	 * the feed — by moving real focus, so the ring shows where you are and
	 * Tab carries on from there. o/c/s act on the focused story by clicking
	 * its own controls, which keeps one code path for mouse and keyboard.
	 */
	function onKeydown(event: KeyboardEvent) {
		const action = shortcutFor(event);
		if (!action) return;
		if (action === 'help') {
			event.preventDefault();
			shortcuts?.toggle();
			return;
		}

		const stories = [...document.querySelectorAll<HTMLElement>('[data-story]')];
		const current = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-story]') ?? null;

		if (action === 'next' || action === 'previous') {
			const target = moveSelection(stories, current, action === 'next' ? 1 : -1);
			if (!target) return;
			event.preventDefault();
			target.focus({ preventScroll: true });
			target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
			return;
		}

		if (!current) return;
		event.preventDefault();
		if (action === 'open') current.querySelector<HTMLElement>('[data-open]')?.click();
		if (action === 'discuss') {
			const link = current.querySelector<HTMLAnchorElement>('[data-discuss]');
			if (link) goto(link.href);
		}
		if (action === 'save') current.querySelector<HTMLElement>('[data-save]')?.click();
	}
</script>

<svelte:head>
	<!-- From `static/`, so the paths are stable in the built site. The `.ico`
	     is there because browsers ask for `/favicon.ico` regardless. -->
	<link rel="icon" href="{base}/favicon.svg" type="image/svg+xml" />
	<link rel="alternate icon" href="{base}/favicon.ico" sizes="32x32" />
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<a
	href="#main"
	class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
>
	Skip to content
</a>

<div class="flex min-h-screen flex-col">
	<header class="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
		<div class="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
			<a href="{base}/" class="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
				<span
					class="grid size-7 place-items-center rounded-md bg-accent text-sm font-bold text-accent-ink"
					aria-hidden="true">db</span
				>
				<!-- `sr-only` rather than `hidden` below `sm`: the wordmark is the
				     link's accessible name, and hiding it outright left the link
				     nameless on phones. -->
				<span class="sr-only font-serif text-lg sm:not-sr-only">Daily Brief</span>
			</a>

			<nav aria-label="Main" class="ml-auto flex min-w-0 flex-wrap items-center gap-1">
				<a
					href="{base}/"
					aria-current={onToday ? 'page' : undefined}
					class="rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-hover
						{onToday ? 'bg-hover font-medium text-ink' : 'text-muted'}"
				>
					Today
				</a>

				<a
					href="{base}/search/"
					aria-current={page.url.pathname === `${base}/search/` ? 'page' : undefined}
					class="rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-hover
						{page.url.pathname === `${base}/search/` ? 'bg-hover font-medium text-ink' : 'text-muted'}"
				>
					Search
				</a>

				<a
					href="{base}/saved/"
					aria-current={page.url.pathname === `${base}/saved/` ? 'page' : undefined}
					class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-hover
						{page.url.pathname === `${base}/saved/` ? 'bg-hover font-medium text-ink' : 'text-muted'}"
				>
					Saved
					{#if savedCount > 0}
						<span
							class="rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-ink tabular-nums"
						>
							{savedCount}
						</span>
					{/if}
				</a>

				<button
					type="button"
					onclick={() => shortcuts?.toggle()}
					class="hidden size-8 place-items-center rounded-md font-mono text-sm text-muted transition-colors hover:bg-hover hover:text-ink sm:grid"
					aria-label="Keyboard shortcuts"
					title="Keyboard shortcuts (?)"
				>
					?
				</button>
				<ThemeToggle />
			</nav>
		</div>
	</header>

	<main id="main" class="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
		{@render children()}
	</main>

	<ShortcutsDialog bind:this={shortcuts} />

	<footer class="border-t border-line">
		<div
			class="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-6 text-sm text-faint sm:flex-row sm:items-center sm:justify-between"
		>
			<p>
				Reads the public
				<a
					class="underline underline-offset-2 hover:text-ink"
					href="https://github.com/HackerNews/API"
					rel="noopener noreferrer"
					target="_blank">Hacker News API</a
				>. No account, no tracking.
			</p>
			<p>Built with Svelte 5 and SvelteKit · press <kbd class="rounded border border-line px-1 font-mono text-xs">?</kbd> for shortcuts.</p>
		</div>
	</footer>
</div>
