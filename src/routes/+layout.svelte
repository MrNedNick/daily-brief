<script lang="ts">
	import { base } from '$app/paths';
	import '../app.css';
	import { page } from '$app/state';
	import { prefs } from '$lib/state/prefs.svelte';
	import { library } from '$lib/state/library.svelte';
	import { FEEDS } from '$lib/api/types';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props();

	// One load of the saved/read ids for the whole app, not per page.
	$effect(() => {
		library.init();
	});

	const onFeed = $derived(page.url.pathname === `${base}/`);
	const savedCount = $derived(library.savedIds.size);
</script>

<svelte:head>
	<!-- From `static/`, so the paths are stable in the built site. The `.ico`
	     is there because browsers ask for `/favicon.ico` regardless. -->
	<link rel="icon" href="{base}/favicon.svg" type="image/svg+xml" />
	<link rel="alternate icon" href="{base}/favicon.ico" sizes="32x32" />
</svelte:head>

<a
	href="#main"
	class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
>
	Skip to content
</a>

<div class="flex min-h-screen flex-col">
	<header class="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
		<div class="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
			<a href="{base}/" class="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
				<span
					class="grid size-7 place-items-center rounded-md bg-accent text-sm font-bold text-accent-ink"
					aria-hidden="true">db</span
				>
				<!-- `sr-only` rather than `hidden` below `sm`: the wordmark is the
				     link's accessible name, and hiding it outright left the link
				     nameless on phones. -->
				<span class="sr-only sm:not-sr-only">Daily Brief</span>
			</a>

			<nav aria-label="Feeds" class="ml-auto flex items-center gap-1">
				{#each FEEDS as feed (feed.id)}
					<a
						href="{base}/?feed={feed.id}"
						aria-current={onFeed && prefs.feed === feed.id ? 'page' : undefined}
						class="rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-hover
							{onFeed && prefs.feed === feed.id ? 'bg-hover font-medium text-ink' : 'text-muted'}"
					>
						{feed.label}
					</a>
				{/each}

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

				<ThemeToggle />
			</nav>
		</div>
	</header>

	<main id="main" class="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
		{@render children()}
	</main>

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
			<p>Built with Svelte 5 and SvelteKit.</p>
		</div>
	</footer>
</div>
