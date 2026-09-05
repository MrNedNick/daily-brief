<script lang="ts">
	import type { Story } from '$lib/api/types';
	import { library } from '$lib/state/library.svelte';

	interface Props {
		story: Story;
	}

	let { story }: Props = $props();

	const saved = $derived(library.isSaved(story.id));
	// Saving pulls the whole comment tree, so it is not instant on a busy
	// thread — the button says so instead of looking stuck.
	const busy = $derived(library.pending.has(story.id));
</script>

<button
	type="button"
	onclick={() => library.toggle(story)}
	disabled={busy}
	aria-pressed={saved}
	aria-label={saved ? `Remove "${story.title}" from saved` : `Save "${story.title}" for offline`}
	title={saved ? 'Saved for offline — click to remove' : 'Save for offline reading'}
	class="grid size-8 shrink-0 place-items-center self-start rounded-md transition-colors
		hover:bg-hover disabled:cursor-progress disabled:opacity-60
		{saved ? 'text-accent' : 'text-faint hover:text-ink'}"
>
	{#if busy}
		<svg viewBox="0 0 24 24" class="size-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
			<path stroke-linecap="round" d="M12 3a9 9 0 0 1 9 9" />
		</svg>
	{:else}
		<svg viewBox="0 0 24 24" class="size-4.5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
		</svg>
	{/if}
</button>
