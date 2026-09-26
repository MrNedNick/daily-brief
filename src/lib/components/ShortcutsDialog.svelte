<script lang="ts">
	import { SHORTCUTS } from '$lib/utils/keyboard';

	let dialog = $state<HTMLDialogElement | null>(null);

	export function toggle() {
		if (!dialog) return;
		if (dialog.open) dialog.close();
		else dialog.showModal();
	}
</script>

<!-- A native <dialog>: focus trapping, Escape to close and the backdrop come
     from the browser rather than from code here. -->
<dialog
	bind:this={dialog}
	aria-labelledby="shortcuts-title"
	class="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-5 text-ink shadow-xl backdrop:bg-black/50"
	onclick={(event) => {
		if (event.target === dialog) dialog?.close();
	}}
>
	<h2 id="shortcuts-title" class="font-serif text-lg font-bold">Keyboard shortcuts</h2>
	<p class="mt-1 text-sm text-muted">Read the whole page without the mouse.</p>
	<dl class="mt-4 space-y-2 text-sm">
		{#each SHORTCUTS as item (item.key)}
			<div class="flex items-center justify-between gap-4">
				<dt class="text-muted">{item.label}</dt>
				<dd>
					<kbd class="rounded border border-line bg-raised px-2 py-0.5 font-mono text-xs">{item.key}</kbd>
				</dd>
			</div>
		{/each}
	</dl>
	<form method="dialog" class="mt-5 text-right">
		<button class="rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-surface">Close</button>
	</form>
</dialog>
