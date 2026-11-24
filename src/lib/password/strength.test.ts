import { describe, expect, it } from 'vitest';
import { passwordStrength } from './strength';

describe('new password rules and indicative strength', () => {
	it.each(['Abcdefghi1!', 'ABCDEFGHIJK1!', 'abcdefghijk1!', 'Abcdefghijk!', 'Abcdefghijk1', 'Éa1!ééééééé'])('rejects a missing required criterion: %s', (value) => {
		expect(passwordStrength(value).valid).toBe(false);
	});
	it('accepts all five criteria, including Unicode, but not NUL or oversized input', () => {
		expect(passwordStrength('Abcdefghij1!').valid).toBe(true);
		expect(passwordStrength('Éa1!éééééééé').valid).toBe(true);
		expect(passwordStrength('aB9!' + 'x'.repeat(1020)).valid).toBe(true);
		expect(passwordStrength('aB9!' + 'x'.repeat(1021)).valid).toBe(false);
		expect(passwordStrength('Abcdefghij1!\0').valid).toBe(false);
		expect(passwordStrength('Abcdefghij1!\uD800').valid).toBe(false);
		expect(passwordStrength('Abcdefghi1  ').hasSymbol).toBe(false);
		expect(passwordStrength('Abcdefghij1\n').hasSymbol).toBe(false);
	});
	it('reports individual criteria and a bounded indicative score', () => {
		expect(passwordStrength('').score).toBe(0);
		expect(passwordStrength('a').hasLower).toBe(true);
		expect(passwordStrength('aB9!'.repeat(5)).score).toBe(4);
		expect(passwordStrength('correcthorsebattery').valid).toBe(false);
		expect(passwordStrength('é'.repeat(6)).bytes).toBe(12);
		expect(passwordStrength('é'.repeat(6)).hasLength).toBe(false);
	});
});
