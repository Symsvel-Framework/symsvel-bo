/**
 * New-password rules. Unicode code points (not UTF-8 bytes) for minimum
 * length; the byte ceiling and NUL guard remain server resource limits.
 * Score is a descriptive heuristic, not a guarantee of resistance to guessing.
 */
export function passwordStrength(password: string) {
	const bytes = new TextEncoder().encode(password).length;
	const characters = Array.from(password).length;
	const hasLength = characters >= 12;
	const hasLower = /\p{Ll}/u.test(password);
	const hasUpper = /\p{Lu}/u.test(password);
	const hasDigit = /\p{Nd}/u.test(password);
	const hasSymbol = /[\p{P}\p{S}]/u.test(password);
	const safeLength =
		bytes <= 1024 && !password.includes('\0') && !/[\uD800-\uDFFF]/u.test(password);
	const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
	const valid = hasLength && safeLength && classes === 4;
	const score =
		password.length === 0
			? 0
			: Math.max(
					1,
					Math.min(
						valid ? 4 : 3,
						Number(hasLength) +
							Number(characters >= 16) +
							Number(classes >= 2) +
							Number(classes >= 3)
					)
				);
	return {
		valid,
		score,
		bytes,
		characters,
		hasLength,
		hasLower,
		hasUpper,
		hasDigit,
		hasSymbol,
		safeLength
	};
}
