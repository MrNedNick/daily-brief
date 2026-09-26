<script lang="ts">
	import { base } from '$app/paths';
	import type { Story } from '$lib/api/types';

	interface Props {
		story: Story;
	}

	let { story }: Props = $props();

	let open = $state(false);
	let status = $state('');
	let manual = $state<string | null>(null);
	let root = $state<HTMLElement | null>(null);

	/** The discussion inside Daily Brief — the link that works for the next reader too. */
	const discussion = $derived(`${location.origin}${base}/item/${story.id}/`);

	// Phones get the system share sheet; desktops, where it is either missing
	// or a small OS menu with no "copy", get two explicit copy buttons.
	const native = typeof navigator !== 'undefined' && 'share' in navigator && matchMedia('(pointer: coarse)').matches;

	async function share() {
		if (native) {
			try {
				await navigator.share({
					title: story.title,
					text: story.url ? `${story.title}\n${story.url}` : story.title,
					url: discussion
				});
			} catch {
				// Dismissing the sheet rejects too; nothing to report.
			}
			return;
		}
		open = !open;
		status = '';
		manual = null;
	}

	async function copy(value: string, what: string) {
		manual = null;
		if (await writeClipboard(value)) {
			status = `${what} link copied`;
			setTimeout(() => (open = false), 900);
		} else {
			// Clipboard access can be refused (embedded frames, strict
			// permissions). Hand the link over selected, ready for Ctrl+C.
			status = 'Copying was blocked — the link is selected below';
			manual = value;
		}
	}

	async function writeClipboard(value: string): Promise<boolean> {
		try {
			await navigator.clipboard.writeText(value);
			return true;
		} catch {
			const area = document.createElement('textarea');
			area.value = value;
			area.setAttribute('readonly', '');
			area.style.position = 'fixed';
			area.style.opacity = '0';
			document.body.append(area);
			area.select();
			try {
				return document.execCommand('copy');
			} catch {
				return false;
			} finally {
				area.remove();
			}
		}
	}

	$effect(() => {
		if (!open) return;
		const close = (event: Event) => {
			if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root?.contains(event.target as Node)) {
				open = false;
			}
		};
		document.addEventListener('pointerdown', close);
		document.addEventListener('keydown', close);
		return () => {
			document.removeEventListener('pointerdown', close);
			document.removeEventListener('keydown', close);
		};
	});
</script>

<div bind:this={root} class="relative shrink-0 self-start">
	<button
		type="button"
		onclick={share}
		aria-expanded={native ? undefined : open}
		aria-haspopup={native ? undefined : 'true'}
		aria-label="Share this story"
		title="Share"
		class="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
	>
		<svg viewBox="0 0 24 24" class="size-4.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" d="M12 15V3m0 0L8 7m4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
		</svg>
	</button>

	{#if open}
		<div class="absolute right-0 z-20 mt-1 w-60 rounded-lg border border-line bg-surface p-1.5 shadow-lg">
			{#if story.url}
				<button
					type="button"
					onclick={() => copy(story.url!, 'Article')}
					class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-hover"
				>
					Copy link to the article
				</button>
			{/if}
			<button
				type="button"
				onclick={() => copy(discussion, 'Discussion')}
				class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-hover"
			>
				Copy link to the discussion
			</button>
			{#if status}
				<p class="px-3 pt-1 pb-1.5 text-xs text-muted" aria-hidden="true">{status}</p>
			{/if}
			{#if manual}
				<!-- svelte-ignore a11y_autofocus -->
				<input
					readonly
					value={manual}
					aria-label="Link to copy"
					autofocus
					onfocus={(event) => event.currentTarget.select()}
					class="mx-1.5 mb-1.5 block w-[calc(100%-0.75rem)] rounded border border-line bg-raised px-2 py-1 text-xs"
				/>
			{/if}
		</div>
	{/if}
	<p class="sr-only" role="status">{status}</p>
</div>
