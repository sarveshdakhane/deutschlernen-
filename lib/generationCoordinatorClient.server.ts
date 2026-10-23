// Client for GenerationCoordinatorDO (workers/generationCoordinator.ts). Takes
// `env` explicitly rather than calling getCloudflareContext() itself, so the
// same function works both from Next.js route handlers (which fetch `env`
// via getCloudflareContext()) and from the raw scheduled() handler in
// workers/entry.ts (which already has `env` as a parameter, with no Next.js
// request context to pull it from).

export type GenerationKind = "readings" | "prepositions";

export async function requestGeneration<T>(
  env: CloudflareEnv,
  date: string,
  kind: GenerationKind,
  force = false
): Promise<T> {
  const id = env.GENERATION_COORDINATOR.idFromName(`${date}:${kind}`);
  const stub = env.GENERATION_COORDINATOR.get(id);
  const url = `https://coordinator.internal/generate?date=${encodeURIComponent(date)}&kind=${kind}${force ? "&force=true" : ""}`;
  const res = await stub.fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`generation coordinator failed (${res.status}): ${body}`);
  }
  return (await res.json()) as T;
}
