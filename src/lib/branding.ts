import { api } from './api/client';

/** Branding is public metadata projected by Back, never the private Setup JSON. */
export function normalizedProjectName(value: unknown): string {
  if (typeof value !== 'string') return 'SymSvel';
  const name = value.trim();
  return name && [...name].length <= 120 && !/[\x00-\x1f\x7f]/.test(name)
    ? name : 'SymSvel';
}

export async function publicProjectName(): Promise<string> {
  try {
    const result = await api<{ data: { name: unknown } }>('/apiopen/project', {
      public: true, skipLocales: true
    });
    return normalizedProjectName(result?.data?.name);
  } catch {
    return 'SymSvel';
  }
}
