<script lang="ts">
	import { base } from '$app/paths';
	import type { Story } from '$lib/api/types';
	import { library } from '$lib/state/library.svelte';
	import { domainOf, timeAgo } from '$lib/utils/format';
	import SaveButton from './SaveButton.svelte';
	import ShareButton from './ShareButton.svelte';

	interface Props {
		story: Story;
		/** The day's top story gets the front-page treatment. */
		lead?: boolean;
		rank: number;
	}

	let { story, lead = false, rank }: Props = $props();

	const domain = $derived(domainOf(story.url));
	const href = $derived(story.url ?? `${base}/item/${story.id}/`);
	const external = $derived(Boolean(story.url));
	const read = $derived(library.isRead(story.id));
	const comments = $derived(story.descendants ?? 0);
</script>

<article data-story={story.id} tabindex="-1" class="flex h-full gap-3 rounded-lg p-3 sm:p-4">
	<div class="min-w-0 flex-1">
		<p class="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.12em] text-muted uppercase">
			<span class="font-serif text-accent tabular-nums">No. {rank}</span>
			{#if domain}<span class="truncate">{domain}</span>{/if}
		</p>
		<h3
			class="mt-1.5 font-serif leading-tight font-bold text-balance
				{lead ? 'text-[1.65rem] sm:text-4xl' : 'text-lg sm:text-xl'}"
		>
			<a
				{href}
				data-open
				rel={external ? 'noopener noreferrer' : undefined}
				target={external ? '_blank' : undefined}
				onclick={() => library.markRead(story.id)}
				class="underline-offset-4 hover:underline {read ? 'text-muted' : 'text-ink'}"
			>
				{story.title}
			</a>
		</h3>
		{#if story.gist}
			<p class="mt-2 leading-relaxed text-ink/85 {lead ? 'text-base sm:text-lg' : 'text-sm'}">{story.gist}</p>
		{/if}
		{#if story.quote}
			<blockquote class="mt-2 border-l-2 border-rule pl-3 text-sm text-muted italic {lead ? 'line-clamp-4 sm:line-clamp-none' : 'line-clamp-3'}">
				“{story.quote.text}”
				<footer class="mt-0.5 text-xs not-italic">— {story.quote.by}, in the discussion</footer>
			</blockquote>
		{/if}
		<p class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
			<span class="tabular-nums">{story.score} points</span>
			<span aria-hidden="true">·</span>
			<a
				href="{base}/item/{story.id}/"
				data-discuss
				class="font-medium text-ink underline-offset-2 hover:underline"
			>
				{comments}
				{comments === 1 ? 'comment' : 'comments'}
			</a>
			<span aria-hidden="true">·</span>
			<time datetime={new Date(story.time * 1000).toISOString()}>{timeAgo(story.time)}</time>
		</p>
	</div>
	<div class="flex shrink-0 flex-col gap-1">
		<SaveButton {story} />
		<ShareButton {story} />
	</div>
</article>
