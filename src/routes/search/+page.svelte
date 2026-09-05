<script lang="ts">
	import { searchStories } from '$lib/api/hn';
	import type { SearchHit, Story } from '$lib/api/types';
	import StoryRow from '$lib/components/StoryRow.svelte';
	import StorySkeleton from '$lib/components/StorySkeleton.svelte';
	import Notice from '$lib/components/Notice.svelte';

	let query = $state('');
	let hits = $state<SearchHit[]>([]);
	let searching = $state(false);
	let failed = $state(false);
	/** The query the results on screen actually belong to. */
	let resultsFor = $state('');

	let debounce: ReturnType<typeof setTimeout>;
	let inFlight: AbortController | null = null;

	/**
	 * Debounce plus abort. Typing fast fires one request, not eight, and a
	 * superseded response can never paint over a newer one — that is the whole
	 * trick behind results never disagreeing with the box.
	 */
	$effect(() => {
		const term = query.trim();
		clearTimeout(debounce);
		inFlight?.abort();

		if (term.length < 2) {
			searching = false;
			failed = false;
			hits = [];
			resultsFor = '';
			return;
		}

		searching = true;
		failed = false;
		const controller = new AbortController();
		inFlight = controller;

		debounce = setTimeout(async () => {
			try {
				const found = await searchStories(term, controller.signal);
				if (controller.signal.aborted) return;
				hits = found;
				resultsFor = term;
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') return;
				failed = true;
				hits = [];
			} finally {
				if (!controller.signal.aborted) searching = false;
			}
		}, 300);

		return () => {
			clearTimeout(debounce);
			controller.abort();
		};
	});

	/** Search hits carry the same fields a row needs, under other names. */
	function asStory(hit: SearchHit): Story {
		return {
			id: hit.id,
			title: hit.title,
			url: hit.url,
			by: hit.author,
			score: hit.points,
			time: hit.createdAt,
			descendants: hit.numComments
		};
	}
</script>

<svelte:head>
	<title>Search — Daily Brief</title>
</svelte:head>

<h1 class="mb-3 text-lg font-semibold">Search Hacker News</h1>

<label class="block">
	<span class="sr-only">Search stories</span>
	<input
		bind:value={query}
		type="search"
		autocomplete="off"
		placeholder="rust, postgres, layoffs…"
		class="w-full rounded-lg border border-line bg-raised px-4 py-2.5 text-ink placeholder:text-faint focus:border-accent focus:outline-none"
	/>
</label>

<p class="mt-2 text-xs text-faint">
	Full-text search across all of Hacker News, by relevance.
</p>

<div class="mt-6">
	{#if query.trim().length > 0 && query.trim().length < 2}
		<p class="text-sm text-faint">Keep typing — at least two characters.</p>
	{:else if searching}
		<StorySkeleton count={5} />
	{:else if failed}
		<Notice tone="error" title="Search is unavailable" body="The search request failed. Try again in a moment." />
	{:else if resultsFor && hits.length === 0}
		<Notice
			title="Nothing found for “{resultsFor}”"
			body="Try a shorter phrase, or a single distinctive word."
		/>
	{:else if hits.length > 0}
		<p class="mb-2 px-3 text-xs text-faint sm:px-4">
			{hits.length} results for “{resultsFor}”
		</p>
		<ul class="divide-y divide-line">
			{#each hits as hit (hit.id)}
				<li><StoryRow story={asStory(hit)} query={resultsFor} /></li>
			{/each}
		</ul>
	{/if}
</div>
