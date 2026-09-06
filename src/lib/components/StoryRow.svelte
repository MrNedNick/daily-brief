<script lang="ts">
	import { base } from '$app/paths';
	import type { Story } from '$lib/api/types';
	import { library } from '$lib/state/library.svelte';
	import { domainOf, timeAgo, highlight } from '$lib/utils/format';
	import SaveButton from './SaveButton.svelte';

	interface Props {
		story: Story;
		/** Position in the list, shown as a rank the way HN does. */
		index?: number;
		/** When set, matching runs in the title are marked. */
		query?: string;
	}

	let { story, index, query = '' }: Props = $props();

	const domain = $derived(domainOf(story.url));
	const href = $derived(story.url ?? `/item/${story.id}`);
	const external = $derived(Boolean(story.url));
	const read = $derived(library.isRead(story.id));
	const titleParts = $derived(highlight(story.title, query));
</script>

<article
	class="group flex gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-raised sm:gap-4 sm:px-4"
>
	{#if index !== undefined}
		<span class="w-6 shrink-0 pt-0.5 text-right text-sm tabular-nums text-faint">{index + 1}</span>
	{/if}

	<div class="min-w-0 flex-1">
		<h2 class="text-[0.975rem] leading-snug font-medium sm:text-base">
			<a
				{href}
				rel={external ? 'noopener noreferrer' : undefined}
				target={external ? '_blank' : undefined}
				onclick={() => library.markRead(story.id)}
				class="underline-offset-2 hover:underline {read ? 'text-muted' : 'text-ink'}"
			>
				{#each titleParts as part (part.value + part.match)}{#if part.match}<mark
							class="rounded-sm bg-accent/25 text-ink">{part.value}</mark
						>{:else}{part.value}{/if}{/each}
			</a>
			{#if domain}
				<span class="ml-1 text-xs font-normal text-faint">({domain})</span>
			{/if}
		</h2>

		<p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
			<span class="tabular-nums">{story.score} points</span>
			<span aria-hidden="true">·</span>
			<span>by {story.by}</span>
			<span aria-hidden="true">·</span>
			<time datetime={new Date(story.time * 1000).toISOString()}>{timeAgo(story.time)}</time>
			<span aria-hidden="true">·</span>
			<a href="{base}/item/{story.id}" class="underline-offset-2 hover:text-ink hover:underline">
				{story.descendants ?? 0}
				{(story.descendants ?? 0) === 1 ? 'comment' : 'comments'}
			</a>
		</p>
	</div>

	<SaveButton {story} />
</article>
