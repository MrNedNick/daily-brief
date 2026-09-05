<script lang="ts">
	import type { SvelteSet } from 'svelte/reactivity';
	import type { CommentNode } from '$lib/api/types';
	import { fetchCommentTree } from '$lib/api/hn';
	import { countReplies, sanitizeHtml, timeAgo } from '$lib/utils/format';
	import Self from './CommentNode.svelte';

	interface Props {
		node: CommentNode;
		depth?: number;
		/** Ids the reader collapsed, shared across the whole tree and kept by
		 *  the page so going back to a thread restores what was folded. */
		collapsed: SvelteSet<number>;
	}

	let { node, depth = 0, collapsed }: Props = $props();

	// Replies past the fetch depth arrive here as ids with no nodes yet.
	let lazy = $state<CommentNode[] | null>(null);
	let loadingMore = $state(false);

	const replies = $derived(lazy ?? node.replies);
	const isCollapsed = $derived(collapsed.has(node.id));
	const hiddenCount = $derived(countReplies(replies));
	const unloaded = $derived(
		replies.length === 0 && (node.kids?.length ?? 0) > 0 && lazy === null ? node.kids!.length : 0
	);
	const body = $derived(sanitizeHtml(node.text));

	function toggle() {
		if (collapsed.has(node.id)) collapsed.delete(node.id);
		else collapsed.add(node.id);
	}

	async function loadReplies() {
		if (loadingMore || !node.kids?.length) return;
		loadingMore = true;
		try {
			lazy = await fetchCommentTree(node.kids, { maxDepth: 3 });
		} catch {
			lazy = [];
		} finally {
			loadingMore = false;
		}
	}
</script>

<li class="border-l border-line pl-3 sm:pl-4">
	<div class="py-2">
		<div class="flex flex-wrap items-center gap-x-2 text-xs text-faint">
			<button
				type="button"
				onclick={toggle}
				aria-expanded={!isCollapsed}
				class="rounded px-1 py-0.5 font-mono text-[0.7rem] transition-colors hover:bg-hover hover:text-ink"
				aria-label={isCollapsed ? 'Expand this thread' : 'Collapse this thread'}
			>
				[{isCollapsed ? '+' : '−'}]
			</button>
			<span class="font-medium text-muted">{node.by ?? 'unknown'}</span>
			<time datetime={new Date(node.time * 1000).toISOString()}>{timeAgo(node.time)}</time>
			{#if isCollapsed && hiddenCount > 0}
				<span class="text-faint">· {hiddenCount} {hiddenCount === 1 ? 'reply' : 'replies'} hidden</span>
			{/if}
		</div>

		{#if !isCollapsed}
			<div class="comment-body mt-1.5 text-sm leading-relaxed text-ink/90">
				<!-- Sanitized in `sanitizeHtml`: scripts, handlers and non-http URLs removed. -->
				{@html body}
			</div>
		{/if}
	</div>

	{#if !isCollapsed}
		{#if replies.length}
			<ul class="ml-0.5">
				{#each replies as reply (reply.id)}
					<Self node={reply} depth={depth + 1} {collapsed} />
				{/each}
			</ul>
		{:else if unloaded > 0}
			<button
				type="button"
				onclick={loadReplies}
				disabled={loadingMore}
				class="mb-2 ml-1 rounded-md px-2 py-1 text-xs text-accent transition-colors hover:bg-hover disabled:opacity-60"
			>
				{loadingMore ? 'Loading…' : `Load ${unloaded} more ${unloaded === 1 ? 'reply' : 'replies'}`}
			</button>
		{/if}
	{/if}
</li>
