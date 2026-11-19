import { describe, expect, it, vi } from 'vitest';
import { normalizedProjectName } from './branding';

describe('Public project branding fallback', () => {
  it('accepts normal Unicode project titles', () => {
    expect(normalizedProjectName('  Projet Démo  ')).toBe('Projet Démo');
  });
  it('never renders control characters or unbounded input', () => {
    for (const input of [null, {}, ' ', 'bad\nname', 'x'.repeat(121)])
      expect(normalizedProjectName(input)).toBe('SymSvel');
  });
});
