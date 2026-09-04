import { apiError, isSupabaseConfigured, supabaseFetch } from "../../../lib/supabase";

const STORY_KEY = "david-madeline";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json({ acceptedAt: null, configured: false });
  }

  try {
    const response = await supabaseFetch(`/rest/v1/relationship_state?story_key=eq.${STORY_KEY}&select=accepted_at&limit=1`);
    if (!response.ok) throw new Error(`Supabase ${response.status}`);
    const rows = (await response.json()) as { accepted_at: string | null }[];
    return Response.json({ acceptedAt: rows[0]?.accepted_at ?? null, configured: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST() {
  try {
    const existing = await supabaseFetch(`/rest/v1/relationship_state?story_key=eq.${STORY_KEY}&select=accepted_at&limit=1`);
    if (!existing.ok) throw new Error(`Supabase ${existing.status}`);
    const savedRows = (await existing.json()) as { accepted_at: string }[];
    if (savedRows[0]?.accepted_at) {
      return Response.json({ acceptedAt: savedRows[0].accepted_at });
    }

    const acceptedAt = new Date().toISOString();
    const response = await supabaseFetch("/rest/v1/relationship_state", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ story_key: STORY_KEY, accepted_at: acceptedAt }),
    });
    if (!response.ok) throw new Error(`Supabase ${response.status}`);
    const rows = (await response.json()) as { accepted_at: string }[];
    return Response.json({ acceptedAt: rows[0]?.accepted_at ?? acceptedAt }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
