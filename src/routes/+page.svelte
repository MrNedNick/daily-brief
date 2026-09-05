<script lang="ts">
	import { page } from '$app/state';
	import { FEEDS, isFeedId } from '$lib/api/types';
	import { feedFor } from '$lib/state/feed.svelte';
	import { prefs } from '$lib/state/prefs.svelte';
	import StoryRow from '$lib/components/StoryRow.svelte';
	import StorySkeleton from '$lib/components/StorySkeleton.svelte';
	import Notice from '$lib/components/Notice.svelte';

	// `?feed=` wins so a link is shareable; without it the reader returns to
	// whichever feed they were last on.
	const requested = $derived(page.url.searchParams.get('feed'));
	const feedId = $derived(isFeedId(requested) ? requested : prefs.feed);
	const controller = $derived(feedFor(feedId));
	const label = $derived(FEEDS.find((f) => f.id === feedId)?.label ?? 'Top');

	$effect(() => {
		prefs.feed = feedId;
		controller.load();
	});

	let sentinel = $state<HTMLElement | null>(null);

	// Infinite scroll: the observer is rebuilt whenever the feed changes,
	// because the controller it should call changes with it.
	$effect(() => {
		const element = sentinel;
		const active = controller;
		if (!element) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) active.loadMore();
			},
			{ rootMargin: '600px 0px' }
		);
		observer.observe(element);
		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>{label} stories — Daily Brief</title>
</svelte:head>

<h1 class="sr-only">{label} stories</h1>

{#if controller.error && controller.stories.length === 0}
	<Notice
		tone="error"
		title="Could not load the feed"
		body={controller.error}
	>
		{#snippet action()}
			<button
				type="button"
				onclick={() => controller.retry()}
				class="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
			>
				Try again
			</button>
		{/snippet}
	</Notice>
{:else if controller.loading && controller.stories.length === 0}
	<StorySkeleton />
{:else if controller.stories.length === 0}
	<Notice title="Nothing here yet" body="Hacker News returned an empty {label.toLowerCase()} feed." />
{:else}
	<ul class="divide-y divide-line">
		{#each controller.stories as story, index (story.id)}
			<li><StoryRow {story} {index} /></li>
		{/each}
	</ul>

	<div bind:this={sentinel} class="h-px" aria-hidden="true"></div>

	{#if controller.loadingMore}
		<div class="border-t border-line pt-2">
			<StorySkeleton count={3} />
		</div>
	{:else if controller.exhausted}
		<p class="py-8 text-center text-sm text-faint">That is the whole {label.toLowerCase()} feed.</p>
	{/if}

	{#if controller.error}
		<p class="py-4 text-center text-sm text-accent" role="alert">{controller.error}</p>
	{/if}
{/if}
