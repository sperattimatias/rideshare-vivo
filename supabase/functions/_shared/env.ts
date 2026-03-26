export function requireEnv(keys: string[]): Record<string, string> {
  const values: Record<string, string> = {};

  for (const key of keys) {
    const value = Deno.env.get(key);
    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    values[key] = value;
  }

  return values;
}
