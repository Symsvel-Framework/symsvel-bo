/**
 * Descriptive password diversity indicator. The server policy remains
 * 12 to 1024 UTF-8 bytes without NUL. Variety is advisory, not an
 * additional password acceptance rule.
 */
export function passwordStrength(password: string): {
	valid: boolean;
	score: number;
	bytes: number;
	hasLower: boolean;
	hasUpper: boolean;
	hasDigit: boolean;
	hasSymbol: boolean;
} {
	const bytes = new TextEncoder().encode(password).length;
	const hasLower = /\p{Ll}/u.test(password);
	const hasUpper = /\p{Lu}/u.test(password);
	const hasDigit = /\p{Nd}/u.test(password);
	const hasSymbol = /[^\p{L}\p{N}\s]/u.test(password);
	const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
	const valid = bytes >= 12 && bytes <= 1024 && !password.includes('\0');
	const score =
		password.length === 0
			? 0
			: Math.min(
					4,
					Number(bytes >= 12) + Number(bytes >= 16) + Number(classes >= 2) + Number(classes >= 3)
				);
	return { valid, score, bytes, hasLower, hasUpper, hasDigit, hasSymbol };
}
