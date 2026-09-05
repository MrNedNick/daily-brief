<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** Kept short: one line explaining what happened and what to do. */
		body?: string;
		tone?: 'neutral' | 'error';
		action?: Snippet;
	}

	let { title, body, tone = 'neutral', action }: Props = $props();
</script>

<div
	role={tone === 'error' ? 'alert' : undefined}
	class="rounded-xl border px-5 py-8 text-center
		{tone === 'error' ? 'border-accent/40 bg-accent/5' : 'border-line bg-raised'}"
>
	<p class="font-medium text-ink">{title}</p>
	{#if body}
		<p class="mx-auto mt-1.5 max-w-sm text-sm text-muted">{body}</p>
	{/if}
	{#if action}
		<div class="mt-4">{@render action()}</div>
	{/if}
</div>
