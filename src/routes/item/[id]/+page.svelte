<script lang="ts">
	import { base } from '$app/paths';
	import { SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import type { CommentNode as Node, Story } from '$lib/api/types';
	import { library } from '$lib/state/library.svelte';
	import { edition } from '$lib/state/edition.svelte';
	import { domainOf, sanitizeHtml, timeAgo } from '$lib/utils/format';
	import CommentNode from '$lib/components/CommentNode.svelte';
	import SaveButton from '$lib/components/SaveButton.svelte';
	import ShareButton from '$lib/components/ShareButton.svelte';
	import Notice from '$lib/components/Notice.svelte';

	let story = $state<Story | null>(null);
	let comments = $state<Node[]>([]);
	let loading = $state(true);
	/** The story is on screen and its comment tree is still on the way. */
	let commentsLoading = $state(false);
	let commentsFailed = $state(false);
	let offline = $state(false);
	let failure = $state<'offline-unsaved' | 'not-found' | 'not-a-story' | 'network' | null>(null);

	/**
	 * Collapsed branches live on the page, not inside each comment, so going
	 * back to a thread finds it folded exactly as it was left. `SvelteSet`
	 * because `.add()` on a plain Set is invisible to the compiler.
	 */
	const collapsed = new SvelteSet<number>();

	const id = $derived(Number(page.params.id));
	const domain = $derived(domainOf(story?.url));
	const body = $derived(sanitizeHtml(story?.text));
	/** The two-line summary, when this story is in today's edition. */
	const gist = $derived(edition.top.find((item) => item.id === id)?.gist);

	$effect(() => {
		edition.load();
	});

	$effect(() => {
		const storyId = id;
		let cancelled = false;
		loading = true;
		failure = null;
		story = null;
		comments = [];
		commentsLoading = false;
		commentsFailed = false;

		// A bare id can point at a comment; rendering that as a story gives an
		// empty headline and "0 points".
		const isStory = (item: Story) => !item.type || item.type === 'story' || item.type === 'job';

		library
			.open(storyId, (early) => {
				if (cancelled || !isStory(early)) return;
				story = early;
				loading = false;
				commentsLoading = true;
			})
			.then((result) => {
				if (cancelled) return;
				if (!isStory(result.story)) {
					story = null;
					failure = 'not-a-story';
					return;
				}
				story = result.story;
				comments = result.comments;
				offline = result.offline;
				library.markRead(storyId);
			})
			.catch((error: unknown) => {
				if (cancelled) return;
				// The headline is already up; only the replies failed.
				if (story) {
					commentsFailed = true;
					return;
				}
				const message = error instanceof Error ? error.message : '';
				failure =
					message === 'offline-unsaved'
						? 'offline-unsaved'
						: message === 'not-found'
							? 'not-found'
							: 'network';
			})
			.finally(() => {
				if (cancelled) return;
				loading = false;
				commentsLoading = false;
			});

		return () => {
			cancelled = true;
		};
	});
</script>

<svelte:head>
	<title>{story ? story.title : 'Discussion'} — Daily Brief</title>
</svelte:head>

<a href="{base}/" class="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
	<span aria-hidden="true">←</span> Back to today's edition
</a>

{#if loading}
	<div class="animate-pulse space-y-3" aria-hidden="true">
		<div class="h-6 w-3/4 rounded bg-hover"></div>
		<div class="h-3 w-52 rounded bg-hover"></div>
		<div class="mt-6 h-20 rounded bg-hover"></div>
		<div class="h-16 rounded bg-hover"></div>
	</div>
	<p class="sr-only" role="status">Loading the discussion</p>
{:else if failure === 'offline-unsaved'}
	<Notice
		tone="error"
		title="You are offline and this story was not saved"
		body="Saved stories keep their comments on this device and open with no connection. This one was not saved before you went offline."
	>
		{#snippet action()}
			<a href="{base}/saved/" class="text-sm text-accent underline underline-offset-2">Open saved stories</a>
		{/snippet}
	</Notice>
{:else if failure === 'not-a-story'}
	<Notice
		title="That link points at a comment"
		body="Item {id} is a reply inside a discussion, not a story of its own."
	>
		{#snippet action()}
			<a href="{base}/" class="text-sm text-accent underline underline-offset-2">Back to the feed</a>
		{/snippet}
	</Notice>
{:else if failure === 'not-found'}
	<Notice title="That story is gone" body="Hacker News has no item with id {id}." />
{:else if failure}
	<Notice tone="error" title="Could not load the discussion" body="The network request failed." />
{:else if story}
	<article>
		<header class="flex gap-3">
			<div class="min-w-0 flex-1">
				<h1 class="font-serif text-2xl leading-tight font-bold text-balance sm:text-3xl">
					{#if story.url}
						<a href={story.url} rel="noopener noreferrer" target="_blank" class="hover:underline">
							{story.title}
						</a>
					{:else}
						{story.title}
					{/if}
				</h1>
				<p class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
					{#if domain}
						<span>{domain}</span>
						<span aria-hidden="true">·</span>
					{/if}
					<span class="tabular-nums">{story.score} points</span>
					<span aria-hidden="true">·</span>
					<span>by {story.by}</span>
					<span aria-hidden="true">·</span>
					<time datetime={new Date(story.time * 1000).toISOString()}>{timeAgo(story.time)}</time>
				</p>
			</div>
			<ShareButton {story} />
			<SaveButton {story} />
		</header>

		{#if gist && !body}
			<section aria-label="What it is about" class="mt-4 rounded-lg border border-line bg-raised px-4 py-3">
				<p class="text-[0.7rem] font-semibold tracking-[0.12em] text-muted uppercase">What it is about</p>
				<p class="mt-1 leading-relaxed">{gist}</p>
				{#if story.url}
					<a
						href={story.url}
						rel="noopener noreferrer"
						target="_blank"
						class="mt-2 inline-block text-sm font-medium text-accent underline underline-offset-2"
					>
						Read the original on {domain} ↗
					</a>
				{/if}
			</section>
		{/if}

		{#if offline}
			<p class="mt-4 rounded-lg border border-line bg-raised px-3 py-2 text-xs text-muted">
				Showing the saved copy — you are offline, so scores and new replies may be out of date.
			</p>
		{/if}

		{#if body}
			<div class="comment-body mt-4 text-sm leading-relaxed text-ink/90">
				<!-- Sanitized in `sanitizeHtml`. -->
				{@html body}
			</div>
		{/if}

		<h2 class="mt-8 mb-1 text-sm font-semibold text-muted">
			{story.descendants ?? 0}
			{(story.descendants ?? 0) === 1 ? 'comment' : 'comments'}
		</h2>

		{#if commentsLoading}
			<div class="mt-3 animate-pulse space-y-3" aria-hidden="true">
				<div class="h-16 rounded bg-hover"></div>
				<div class="ml-6 h-12 rounded bg-hover"></div>
				<div class="h-16 rounded bg-hover"></div>
			</div>
			<p class="sr-only" role="status">Loading the comments</p>
		{:else if commentsFailed}
			<Notice tone="error" title="Could not load the comments" body="The story loaded, but the network request for its replies failed." />
		{:else if comments.length}
			<ul class="-ml-3 sm:-ml-4">
				{#each comments as comment (comment.id)}
					<CommentNode node={comment} {collapsed} />
				{/each}
			</ul>
		{:else}
			<Notice title="No comments yet" body="Nobody has replied to this story." />
		{/if}
	</article>
{/if}
