<script lang="ts">
	import { base } from '$app/paths';
	import { library } from '$lib/state/library.svelte';
	import { timeAgo } from '$lib/utils/format';
	import StoryRow from '$lib/components/StoryRow.svelte';
	import Notice from '$lib/components/Notice.svelte';

	$effect(() => {
		library.refreshSaved();
	});
</script>

<svelte:head>
	<title>Saved stories — Daily Brief</title>
</svelte:head>

<header class="mb-4">
	<h1 class="text-lg font-semibold">Saved for offline</h1>
	<p class="mt-1 text-sm text-muted">
		Each of these was stored with its comment tree, so they open with no connection.
	</p>
</header>

{#if library.failed}
	<Notice
		tone="error"
		title="Cannot open local storage"
		body="Saved stories live in this browser's database, and it would not open. Private-browsing windows block it, and another tab of this app can hold it during an upgrade — closing other tabs and reloading usually fixes it."
	/>
{:else if !library.ready}
	<p class="py-8 text-center text-sm text-faint" role="status">Loading your library…</p>
{:else if library.saved.length === 0}
	<Notice
		title="Nothing saved yet"
		body="Use the bookmark button on any story to keep it — and its discussion — for reading offline."
	>
		{#snippet action()}
			<a href="{base}/" class="text-sm text-accent underline underline-offset-2">Browse the top feed</a>
		{/snippet}
	</Notice>
{:else}
	<ul class="divide-y divide-line">
		{#each library.saved as entry (entry.story.id)}
			<li>
				<StoryRow story={entry.story} />
				<p class="px-3 pb-2 text-xs text-faint sm:px-4">
					Saved {timeAgo(Math.floor(entry.savedAt / 1000))}
				</p>
			</li>
		{/each}
	</ul>
{/if}
