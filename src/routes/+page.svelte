<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { FEEDS, isFeedId, type FeedId } from '$lib/api/types';
	import { feedFor } from '$lib/state/feed.svelte';
	import { edition } from '$lib/state/edition.svelte';
	import { prefs } from '$lib/state/prefs.svelte';
	import { TOPICS, filterByTopic, isTopicId, type TopicId } from '$lib/utils/topics';
	import { timeAgo } from '$lib/utils/format';
	import StoryRow from '$lib/components/StoryRow.svelte';
	import StorySkeleton from '$lib/components/StorySkeleton.svelte';
	import EditionStory from '$lib/components/EditionStory.svelte';
	import EditionSkeleton from '$lib/components/EditionSkeleton.svelte';
	import OnThisDay from '$lib/components/OnThisDay.svelte';
	import Notice from '$lib/components/Notice.svelte';

	// `?feed=` and `?topic=` win so a link is shareable; without them the
	// reader returns to whichever feed they were last on, unfiltered.
	const requested = $derived(page.url.searchParams.get('feed'));
	const feedId = $derived(isFeedId(requested) ? requested : prefs.feed);
	const requestedTopic = $derived(page.url.searchParams.get('topic'));
	const topic = $derived<TopicId | null>(isTopicId(requestedTopic) ? requestedTopic : null);

	const controller = $derived(feedFor(feedId));
	const label = $derived(FEEDS.find((f) => f.id === feedId)?.label ?? 'Top');
	const topicLabel = $derived(TOPICS.find((t) => t.id === topic)?.label ?? '');
	const visible = $derived(filterByTopic(controller.stories, topic));

	const today = new Date().toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	$effect(() => {
		untrack(() => edition.load());
	});

	// Only the feed id is a dependency. `load()` reads the controller's own
	// `loading` flag; tracked, every failed request would re-run this effect
	// and retry at once, forever — which is exactly what froze the page
	// offline.
	$effect(() => {
		const active = controller;
		prefs.feed = feedId;
		untrack(() => active.load());
	});

	/** A link that changes one filter and keeps the other. */
	function linkTo(next: { feed?: FeedId; topic?: TopicId | null }): string {
		const params = new URLSearchParams();
		params.set('feed', next.feed ?? feedId);
		const nextTopic = next.topic === undefined ? topic : next.topic;
		if (nextTopic) params.set('topic', nextTopic);
		return `?${params}`;
	}

	let sentinel = $state<HTMLElement | null>(null);

	// Infinite scroll. The observer is rebuilt when the feed changes and after
	// every page: a new observer reports straight away whether the sentinel is
	// on screen, which is what keeps a topic filter that matched only a couple
	// of stories loading until it has enough to fill the page.
	$effect(() => {
		const element = sentinel;
		const active = controller;
		void visible.length;
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
	<title>Daily Brief — today's edition of Hacker News</title>
</svelte:head>

<header class="border-b-4 border-double border-rule pb-4 text-center">
	<p class="text-xs font-semibold tracking-[0.18em] text-muted uppercase">{today}</p>
	<h1 class="mt-1 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Daily Brief</h1>
	<p class="mt-1.5 font-serif text-sm text-muted italic sm:text-base">
		What Hacker News talked about in the last 24 hours
	</p>
</header>

<section aria-labelledby="edition" class="mt-6">
	<div class="mb-2 flex items-baseline justify-between gap-3 border-b border-rule pb-1.5">
		<h2 id="edition" class="text-xs font-bold tracking-[0.18em] uppercase">Today's edition</h2>
		{#if edition.topFrom !== null}
			<p class="text-xs text-muted">Saved {timeAgo(Math.floor(edition.topFrom / 1000))}</p>
		{/if}
	</div>

	{#if edition.topError}
		<Notice
			tone="error"
			title="Could not load today's edition"
			body="Hacker News search did not answer. Check your connection and try again."
		>
			{#snippet action()}
				<button
					type="button"
					onclick={() => edition.retry()}
					class="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
				>
					Try again
				</button>
			{/snippet}
		</Notice>
	{:else if edition.top.length === 0}
		<EditionSkeleton />
		<p class="sr-only" role="status">Loading today's edition</p>
	{:else}
		{@const [lead, ...others] = edition.top}
		<EditionStory story={lead} rank={1} lead />
		<ol class="grid border-t border-line sm:grid-cols-2" start="2">
			{#each others as story, index (story.id)}
				<li
					class="border-b border-line sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0"
				>
					<EditionStory {story} rank={index + 2} />
				</li>
			{/each}
		</ol>
	{/if}
</section>

{#if edition.fact}
	<div class="mt-8">
		<OnThisDay fact={edition.fact} />
	</div>
{:else if edition.factLoading}
	<div class="mt-8 h-40 animate-pulse border-y-2 border-rule bg-raised" aria-hidden="true"></div>
{/if}

<section aria-labelledby="feeds" class="mt-10">
	<div class="border-b border-rule pb-1.5">
		<h2 id="feeds" class="text-xs font-bold tracking-[0.18em] uppercase">The feeds</h2>
	</div>

	<nav aria-label="Sections" class="mt-3 flex flex-wrap gap-1.5">
		{#each FEEDS as feed (feed.id)}
			<a
				href={linkTo({ feed: feed.id })}
				data-sveltekit-noscroll
				aria-current={feed.id === feedId ? 'page' : undefined}
				class="rounded-full border px-3 py-1 text-sm transition-colors
					{feed.id === feedId
					? 'border-ink bg-ink font-medium text-surface'
					: 'border-line text-muted hover:border-ink hover:text-ink'}"
			>
				{feed.label}
			</a>
		{/each}
	</nav>

	<nav aria-label="Topics" class="mt-2 flex flex-wrap items-center gap-1.5">
		<span class="mr-1 text-xs text-muted">Topic</span>
		<a
			href={linkTo({ topic: null })}
			data-sveltekit-noscroll
			aria-current={topic === null ? 'true' : undefined}
			class="rounded-full px-2.5 py-0.5 text-xs transition-colors
				{topic === null ? 'bg-hover font-semibold text-ink' : 'text-muted hover:text-ink'}"
		>
			All
		</a>
		{#each TOPICS as item (item.id)}
			<a
				href={linkTo({ topic: item.id })}
				data-sveltekit-noscroll
				aria-current={item.id === topic ? 'true' : undefined}
				class="rounded-full px-2.5 py-0.5 text-xs transition-colors
					{item.id === topic ? 'bg-hover font-semibold text-ink' : 'text-muted hover:text-ink'}"
			>
				{item.label}
			</a>
		{/each}
	</nav>

	<div class="mt-3">
		{#if controller.error && controller.stories.length === 0}
			<Notice tone="error" title="Could not load the feed" body={controller.error}>
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
			<Notice
				title="Nothing here yet"
				body="Hacker News returned an empty {label} feed."
			/>
		{:else}
			{#if topic}
				<p class="px-3 pb-2 text-xs text-muted sm:px-4" role="status">
					{visible.length}
					{topicLabel} {visible.length === 1 ? 'story' : 'stories'} in the first {controller.stories.length} of {label}
				</p>
			{/if}

			{#if visible.length === 0 && controller.exhausted}
				<Notice
					title="No {topicLabel} stories in {label} right now"
					body="The topic filter matches titles and sites; nothing in this feed fits it today."
				>
					{#snippet action()}
						<a href={linkTo({ topic: null })} data-sveltekit-noscroll class="text-sm text-accent underline underline-offset-2">
							Show the whole feed
						</a>
					{/snippet}
				</Notice>
			{:else}
				<ul class="divide-y divide-line">
					{#each visible as story, index (story.id)}
						<li><StoryRow {story} {index} /></li>
					{/each}
				</ul>
			{/if}

			<div bind:this={sentinel} class="h-px" aria-hidden="true"></div>

			{#if controller.loadingMore}
				<div class="border-t border-line pt-2">
					<StorySkeleton count={3} />
				</div>
			{:else if controller.exhausted}
				<p class="py-8 text-center text-sm text-muted">That is the whole {label} feed.</p>
			{/if}

			{#if controller.error}
				<p class="py-4 text-center text-sm text-accent" role="alert">{controller.error}</p>
			{/if}
		{/if}
	</div>
</section>
