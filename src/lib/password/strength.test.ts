import { describe, expect, it } from 'vitest';
import { passwordStrength } from './strength';

describe('password diversity indicator', () => {
	it('uses UTF-8 byte limits, not JS character counts', () => {
		expect(passwordStrength('x'.repeat(11)).valid).toBe(false);
		expect(passwordStrength('x'.repeat(12)).valid).toBe(true);
		expect(passwordStrength('é'.repeat(6)).bytes).toBe(12);
		expect(passwordStrength('x'.repeat(1025)).valid).toBe(false);
		expect(passwordStrength('x'.repeat(12) + '\0').valid).toBe(false);
	});
	it('does not require additional character classes to accept a password', () => {
		expect(passwordStrength('correcthorsebattery').valid).toBe(true);
		expect(passwordStrength('aB9!'.repeat(5)).score).toBe(4);
		expect(passwordStrength('').score).toBe(0);
	});
});
