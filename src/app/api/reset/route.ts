import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getSupermemory } from '@/lib/supermemory';

export async function POST(req: NextRequest) {
  try {
    const { userName } = await req.json();
    if (!userName) return NextResponse.json({ error: 'Missing userName' }, { status: 400 });

    // 1. Clear in-memory store (sessions + reports)
    store.clearUser(userName);

    // 2. Clear Supermemory data for this user
    // Search and delete all records tagged with this user
    try {
      const client = getSupermemory();
      const types = ['weakness_profile', 'session_report', 'category_record'];
      for (const type of types) {
        const results = await client.search.execute({
          q: '*',
          containerTags: [`user_${userName}`],
          filters: { AND: [{ key: 'type', value: type }] },
        });
        if (results.results) {
          for (const result of results.results) {
            try {
              const id = (result as any).id;
              if (id) {
                await client.delete(id);
              }
            } catch {
              // Skip individual deletion failures
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to clear Supermemory data (non-critical):', err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Reset failed:', err);
    return NextResponse.json({ error: 'Failed to reset' }, { status: 500 });
  }
}
