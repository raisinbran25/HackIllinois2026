import Supermemory from 'supermemory';

let client: Supermemory | null = null;

export function getSupermemory(): Supermemory {
  if (!client) {
    client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!,
    });
  }
  return client;
}
