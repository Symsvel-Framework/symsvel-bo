<script lang="ts">
	import { uiLanguage } from '../api/locales';
	import { generatedTranslation } from '../i18n/generated-translations';
	import { passwordStrength } from './strength';

	let { password }: { password: string } = $props();
	const defaults = {
		fr: {
			length: '12 caractères minimum',
			upper: 'Une lettre majuscule',
			lower: 'Une lettre minuscule',
			digit: 'Un chiffre',
			symbol: 'Un caractère spécial',
			heading: 'Critères du mot de passe',
			strength: 'Force du mot de passe (indicative)',
			empty: 'Non renseigné',
			veryWeak: 'Très faible',
			weak: 'Faible',
			moderate: 'Moyenne',
			strong: 'Bonne',
			tooLong: 'Mot de passe trop long ou caractères non pris en charge.',
			met: 'Satisfait',
			unmet: 'Non satisfait'
		},
		en: {
			length: 'At least 12 characters',
			upper: 'One uppercase letter',
			lower: 'One lowercase letter',
			digit: 'One digit',
			symbol: 'One special character',
			heading: 'Password requirements',
			strength: 'Password strength (estimate)',
			empty: 'Not entered',
			veryWeak: 'Very weak',
			weak: 'Weak',
			moderate: 'Moderate',
			strong: 'Good',
			tooLong: 'Password is too long or contains unsupported characters.',
			met: 'Met',
			unmet: 'Not met'
		}
	};
	const copy = $derived($uiLanguage?.toLowerCase().startsWith('en') ? defaults.en : defaults.fr);
	function tr(key: keyof typeof defaults.fr): string {
		return generatedTranslation($uiLanguage, 'bo.system.password.' + key) ?? copy[key];
	}
	const result = $derived(passwordStrength(password));
	const rules = $derived([
		{ key: 'length' as const, met: result.hasLength },
		{ key: 'upper' as const, met: result.hasUpper },
		{ key: 'lower' as const, met: result.hasLower },
		{ key: 'digit' as const, met: result.hasDigit },
		{ key: 'symbol' as const, met: result.hasSymbol }
	]);
	const levels = ['empty', 'veryWeak', 'weak', 'moderate', 'strong'] as const;
</script>

<div class="password-feedback">
	<p class="caption">{tr('heading')}</p>
	<ul class="requirements">
		{#each rules as rule (rule.key)}
			<li class:met={rule.met}>
				<span aria-hidden="true">{rule.met ? '✓' : '✕'}</span>
				<span>{tr(rule.key)}</span>
				<span class="sr-only">: {tr(rule.met ? 'met' : 'unmet')}</span>
			</li>
		{/each}
	</ul>
	{#if !result.safeLength}<p class="invalid" role="alert">{tr('tooLong')}</p>{/if}
	<div class="caption" aria-live="polite">{tr('strength')} : {tr(levels[result.score])}</div>
	<div
		class="strength-track"
		role="meter"
		aria-label={tr('strength')}
		aria-valuemin={0}
		aria-valuemax={4}
		aria-valuenow={result.score}
		aria-valuetext={tr(levels[result.score])}
	>
		{#each [1, 2, 3, 4] as segment (segment)}
			<span
				class:filled={segment <= result.score}
				class:weak={result.score <= 2}
				class:moderate={result.score === 3}
			></span>
		{/each}
	</div>
</div>

<style>
	.password-feedback {
		display: grid;
		gap: 0.4rem;
		font-size: 0.875rem;
	}
	.password-feedback .caption {
		margin: 0;
		color: var(--bo-text);
		font-weight: 600;
	}
	.requirements {
		display: grid;
		gap: 0.25rem;
		padding: 0;
		margin: 0 0 0.35rem;
		list-style: none;
	}
	.requirements li {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
		color: var(--bo-error-text);
	}
	.requirements li.met {
		color: var(--bo-success-text);
	}
	.invalid {
		color: var(--bo-error-text);
		margin: 0;
	}
	.strength-track {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
		height: 7px;
	}
	.strength-track span {
		border-radius: 4px;
		background: var(--bo-border);
	}
	.strength-track .filled {
		background: var(--bo-action-success);
	}
	.strength-track .filled.weak {
		background: var(--bo-danger);
	}
	.strength-track .filled.moderate {
		background: var(--bo-action-warning);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
