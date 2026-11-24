import { getContext, onMount, setContext } from 'svelte';
import { readable, writable, type Readable } from 'svelte/store';
import { api } from './api/client';

/** Branding is public metadata projected by Back, never the private Setup JSON. */
export function normalizedProjectName(value: unknown): string {
	if (typeof value !== 'string') return 'SymSvel';
	const name = value.trim();
	const hasControls = [...name].some((character) => {
		const point = character.codePointAt(0);
		return point !== undefined && (point < 32 || point === 127);
	});
	if (!name || [...name].length > 120 || hasControls) return 'SymSvel';
	return name;
}

export async function publicProjectName(): Promise<string> {
	try {
		const result = await api<{ data: { name: unknown } }>('/apiopen/project', {
			public: true,
			skipLocales: true
		});
		return normalizedProjectName(result?.data?.name);
	} catch {
		return 'SymSvel';
	}
}

/** One request per root layout; context is isolated from other layout instances. */
const projectBrandKey = Symbol('project-brand');

export function provideProjectBrand(): Readable<string> {
	const brand = writable('SymSvel');
	setContext(projectBrandKey, brand);
	onMount(() => {
		let mounted = true;
		void publicProjectName().then((name) => {
			if (mounted) brand.set(name);
		});
		return () => {
			mounted = false;
		};
	});
	return brand;
}

/** Call during component initialization, including module pages. */
export function getProjectBrand(): Readable<string> {
	return getContext<Readable<string> | undefined>(projectBrandKey) ?? readable('SymSvel');
}
