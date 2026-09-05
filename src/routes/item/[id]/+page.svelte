<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import type { CommentNode as Node, Story } from '$lib/api/types';
	import { library } from '$lib/state/library.svelte';
	import { domainOf, sanitizeHtml, timeAgo } from '$lib/utils/format';
	import CommentNode from '$lib/components/CommentNode.svelte';
	import SaveButton from '$lib/components/SaveButton.svelte';
	import Notice from '$lib/components/Notice.svelte';

	let story = $state<Story | null>(null);
	let comments = $state<Node[]>([]);
	let loading = $state(true);
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

	$effect(() => {
		const storyId = id;
		let cancelled = false;
		loading = true;
		failure = null;

		library
			.open(storyId)
			.then((result) => {
				if (cancelled) return;
				// A bare id can point at a comment; rendering that as a story
				// gives an empty headline and "0 points".
				if (result.story.type && result.story.type !== 'story' && result.story.type !== 'job') {
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
				const message = error instanceof Error ? error.message : '';
				failure =
					message === 'offline-unsaved'
						? 'offline-unsaved'
						: message === 'not-found'
							? 'not-found'
							: 'network';
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
		};
	});
</script>

<svelte:head>
	<title>{story ? story.title : 'Discussion'} — Daily Brief</title>
</svelte:head>

<a href="/" class="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
	<span aria-hidden="true">←</span> Back to stories
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
			<a href="/saved" class="text-sm text-accent underline underline-offset-2">Open saved stories</a>
		{/snippet}
	</Notice>
{:else if failure === 'not-a-story'}
	<Notice
		title="That link points at a comment"
		body="Item {id} is a reply inside a discussion, not a story of its own."
	>
		{#snippet action()}
			<a href="/" class="text-sm text-accent underline underline-offset-2">Back to the feed</a>
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
				<h1 class="text-xl leading-snug font-semibold text-balance">
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
			<SaveButton {story} />
		</header>

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

		{#if comments.length}
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
