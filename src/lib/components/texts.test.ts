import { describe, expect, it } from 'vitest';
import { boComponentCopy } from './texts';

describe('shared BO components localization', () => {
	it('uses French or English labels from interface locale', () => {
		expect(boComponentCopy('fr-FR').next).toBe('Page suivante');
		expect(boComponentCopy('en-GB').next).toBe('Next page');
		expect(boComponentCopy('es-ES').next).toBe('Page suivante');
		expect(boComponentCopy(null).next).toBe('Page suivante');
	});
});
