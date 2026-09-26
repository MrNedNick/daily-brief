<!-- Same footprint as the edition: one lead and six in a two-column grid, so
     nothing below it moves when the stories arrive. -->
<div class="animate-pulse" aria-hidden="true">
	<div class="space-y-3 p-3 sm:p-4">
		<div class="h-3 w-32 rounded bg-hover"></div>
		<div class="h-8 w-11/12 rounded bg-hover sm:h-9"></div>
		<div class="h-8 w-2/3 rounded bg-hover sm:h-9"></div>
		<div class="h-3 w-48 rounded bg-hover"></div>
	</div>
	<div class="grid border-t border-line sm:grid-cols-2">
		{#each { length: 6 } as _, i (i)}
			<div class="space-y-2.5 border-b border-line p-3 sm:p-4">
				<div class="h-3 w-24 rounded bg-hover"></div>
				<div class="h-5 w-11/12 rounded bg-hover"></div>
				<div class="h-5 w-3/5 rounded bg-hover"></div>
				<div class="h-3 w-40 rounded bg-hover"></div>
			</div>
		{/each}
	</div>
</div>
