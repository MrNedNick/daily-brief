<script lang="ts">
	interface Props {
		count?: number;
	}

	let { count = 12 }: Props = $props();
</script>

<!-- Same row geometry as StoryRow, and enough rows to fill a viewport: a
     short skeleton puts the footer above the fold and drops it when the real
     feed arrives, which is a layout shift Lighthouse counts against you. -->
<ul class="divide-y divide-line" aria-hidden="true">
	{#each { length: count } as _, i (i)}
		<li class="flex animate-pulse gap-3 px-3 py-3 sm:gap-4 sm:px-4">
			<span class="h-4 w-6 shrink-0 rounded bg-hover"></span>
			<div class="min-w-0 flex-1 space-y-2">
				<div class="h-4 rounded bg-hover" style="width: {70 + ((i * 7) % 25)}%"></div>
				<div class="h-3 w-40 rounded bg-hover"></div>
			</div>
			<span class="size-8 shrink-0 rounded-md bg-hover"></span>
		</li>
	{/each}
</ul>
