import type { Story } from '../api/types';
import { domainOf } from './format';

/**
 * Topic filters, kept deliberately dumb and in one place: a story belongs to a
 * topic when its link points at one of the listed domains or its title
 * contains one of the listed words. No model, no scoring — anyone can read
 * this file and predict what a filter will show.
 */

export type TopicId = 'ai' | 'programming' | 'science' | 'security';

interface Rule {
	id: TopicId;
	label: string;
	/** Matched against the hostname and its parent domains. */
	domains: string[];
	/** Whole words or phrases, case-insensitive. */
	keywords: string[];
}

export const TOPICS: Rule[] = [
	{
		id: 'ai',
		label: 'AI',
		domains: ['openai.com', 'anthropic.com', 'huggingface.co', 'deepmind.google', 'mistral.ai'],
		keywords: [
			'ai',
			'llm',
			'llms',
			'gpt',
			'chatgpt',
			'claude',
			'gemini',
			'openai',
			'anthropic',
			'machine learning',
			'neural',
			'transformer',
			'diffusion',
			'agent',
			'agents',
			'inference',
			'fine-tuning',
			'deep learning'
		]
	},
	{
		id: 'programming',
		label: 'Programming',
		domains: ['github.com', 'gitlab.com', 'go.dev', 'rust-lang.org', 'python.org', 'stackoverflow.com'],
		keywords: [
			'rust',
			'python',
			'javascript',
			'typescript',
			'golang',
			'compiler',
			'programming',
			'programmer',
			'programmers',
			'database',
			'postgres',
			'sqlite',
			'linux',
			'kernel',
			'api',
			'git',
			'c++',
			'wasm',
			'webassembly',
			'refactoring',
			'open source',
			'framework'
		]
	},
	{
		id: 'science',
		label: 'Science',
		domains: ['nature.com', 'science.org', 'arxiv.org', 'quantamagazine.org', 'nasa.gov', 'phys.org', 'newscientist.com'],
		keywords: [
			'physics',
			'quantum',
			'biology',
			'chemistry',
			'astronomy',
			'galaxy',
			'gravity',
			'telescope',
			'nasa',
			'climate',
			'researchers',
			'scientists',
			'study',
			'dna',
			'protein',
			'mathematics',
			'math',
			'theorem'
		]
	},
	{
		id: 'security',
		label: 'Security',
		domains: ['krebsonsecurity.com', 'bleepingcomputer.com', 'schneier.com', 'projectzero.google'],
		keywords: [
			'security',
			'vulnerability',
			'vulnerabilities',
			'exploit',
			'cve',
			'malware',
			'ransomware',
			'breach',
			'hacked',
			'hack',
			'phishing',
			'encryption',
			'backdoor',
			'zero-day',
			'privacy',
			'surveillance',
			'password',
			'passwords'
		]
	}
];

export function isTopicId(value: unknown): value is TopicId {
	return TOPICS.some((topic) => topic.id === value);
}

function escape(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// One regex per topic, built once. Word edges are "not a letter or digit"
// rather than `\b`, so `c++` and `fine-tuning` match as written.
const patterns = new Map(
	TOPICS.map((topic) => [
		topic.id,
		new RegExp(`(^|[^\\p{L}\\p{N}])(${topic.keywords.map(escape).join('|')})(?=$|[^\\p{L}\\p{N}])`, 'iu')
	])
);

function onDomain(hostname: string, domains: string[]): boolean {
	return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export function matchesTopic(story: Pick<Story, 'title' | 'url'>, id: TopicId): boolean {
	const topic = TOPICS.find((t) => t.id === id);
	if (!topic) return false;
	const hostname = domainOf(story.url);
	if (hostname && onDomain(hostname, topic.domains)) return true;
	return patterns.get(id)!.test(story.title);
}

/** `null` means "no filter" — the feed comes back whole. */
export function filterByTopic<T extends Pick<Story, 'title' | 'url'>>(
	stories: T[],
	id: TopicId | null
): T[] {
	return id ? stories.filter((story) => matchesTopic(story, id)) : stories;
}
