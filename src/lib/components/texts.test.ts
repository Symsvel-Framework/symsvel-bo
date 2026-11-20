import { describe, expect, it } from 'vitest';
import { boComponentCopy } from './texts';

describe('shared BO components localization', () => {
	it('uses French or English labels from interface locale', () => {
		expect(boComponentCopy('fr-FR').next).toBe('Page suivante');
		expect(boComponentCopy('en-GB').next).toBe('Next page');
		expect(boComponentCopy('es-ES').next).toBe('Page suivante');
		expect(boComponentCopy(null).next).toBe('Page suivante');
		expect(boComponentCopy('fr').count(1, 10, 20)).toBe('1–10 sur 20 résultats');
		expect(boComponentCopy('en').count(1, 10, 20)).toBe('1–10 of 20 results');
		expect(boComponentCopy('fr').page(2, 5)).toBe('Page 2 / 5');
	});
});
