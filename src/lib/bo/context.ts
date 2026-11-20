import { getContext } from 'svelte';
import type { BoIdentity } from '../api/session';
import type { BoNavigationItem } from './navigation';

/** The authenticated host provides identity and permitted navigation to pages. */
export type BoShellContext = {
	readonly identity: BoIdentity | null;
	readonly modules: readonly BoNavigationItem[];
	readonly modulesPending: boolean;
	readonly detectedModules: number;
};
export const boShellKey = Symbol('symsvel-bo-shell');

export function getBoShell(): BoShellContext {
	const shell = getContext<BoShellContext>(boShellKey);
	if (!shell) throw new Error('Authenticated BO shell is required.');
	return shell;
}
