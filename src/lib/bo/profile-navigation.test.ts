import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const shell = readFileSync(new URL('../components/AppShell.svelte', import.meta.url), 'utf8');
describe('BO personal account menu', () => {
  it('links to the native Admins self-profile without the administrators-list ACL', () => {
    expect(shell).toContain("href={resolve('/profile' as Path)}");
    expect(shell).toContain('bo.admins.profile.title');
    expect(shell).toContain('menuOpen = false');
  });
});
