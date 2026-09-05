<script lang="ts">
	import { prefs } from '$lib/state/prefs.svelte';
</script>

<button
	type="button"
	onclick={() => prefs.toggleTheme()}
	class="ml-1 grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
	aria-label={prefs.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
	title={prefs.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
>
	{#if prefs.theme === 'dark'}
		<svg viewBox="0 0 24 24" class="size-4.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<circle cx="12" cy="12" r="4" />
			<path stroke-linecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
		</svg>
	{:else}
		<svg viewBox="0 0 24 24" class="size-4.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
		</svg>
	{/if}
</button>
