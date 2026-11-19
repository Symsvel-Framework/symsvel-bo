/**
 * Pages accessible before a BO session exists. The backend still validates
 * 2FA challenges; excluding AppShell only avoids a premature refresh request.
 */
export function isPublicBoRoute(pathname: string): boolean {
	return (
		pathname === '/' ||
		pathname === '/login' ||
		pathname === '/two-factor' ||
		pathname === '/verify-email-change' ||
		pathname.startsWith('/auth/')
	);
}
