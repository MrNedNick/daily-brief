<script lang="ts">
	import { base } from '$app/paths';
	import type { OnThisDay } from '$lib/api/brief';
	import { dateKey } from '$lib/api/brief';
	import { domainOf } from '$lib/utils/format';

	interface Props {
		fact: OnThisDay;
	}

	let { fact }: Props = $props();

	const yearsAgo = $derived(Number(fact.date.slice(0, 4)) - fact.year);
	// Offline on a new day, the card is yesterday's (or older). Say so.
	const stale = $derived(fact.date !== dateKey(new Date()));
	const staleLabel = $derived(
		new Date(`${fact.date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
	);
	const [first, ...rest] = $derived(fact.stories);
</script>

<section
	aria-labelledby="on-this-day"
	class="relative border-y-2 border-rule bg-raised px-4 py-5 sm:px-6"
>
	<p class="text-[0.7rem] font-semibold tracking-[0.18em] text-accent uppercase">
		On this day · {fact.year}
	</p>
	<h2 id="on-this-day" class="mt-1 font-serif text-lg font-semibold text-muted italic">
		{yearsAgo}
		{yearsAgo === 1 ? 'year' : 'years'} ago on Hacker News
	</h2>

	<article class="mt-3">
		<h3 class="font-serif text-2xl leading-tight font-bold text-balance">
			<a
				href={first.url ?? `${base}/item/${first.id}/`}
				rel={first.url ? 'noopener noreferrer' : undefined}
				target={first.url ? '_blank' : undefined}
				class="underline-offset-4 hover:underline"
			>
				{first.title}
			</a>
		</h3>
		<p class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
			{#if domainOf(first.url)}
				<span>{domainOf(first.url)}</span>
				<span aria-hidden="true">·</span>
			{/if}
			<span class="tabular-nums">{first.score} points</span>
			<span aria-hidden="true">·</span>
			<span>by {first.by}</span>
			<span aria-hidden="true">·</span>
			<a href="{base}/item/{first.id}/" class="font-medium text-ink underline underline-offset-2">
				Read the {first.descendants}-comment discussion
			</a>
		</p>
	</article>

	{#if rest.length}
		<p class="mt-4 text-xs font-semibold text-muted">Also that day</p>
		<ul class="mt-1 space-y-1.5">
			{#each rest as story (story.id)}
				<li class="font-serif text-[0.95rem] leading-snug">
					<a href="{base}/item/{story.id}/" class="underline-offset-2 hover:underline">{story.title}</a>
					<span class="font-sans text-xs text-muted tabular-nums">· {story.score} points</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if stale}
		<p class="mt-4 text-xs text-muted">From the {staleLabel} edition — you are offline, so this is the last one saved.</p>
	{/if}
</section>
