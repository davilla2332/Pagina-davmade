import { apiError, supabaseFetch, uploadCodeMatches } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

const ALLOWED_KINDS = new Set(["event", "task", "plan", "note"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export async function GET() {
  try {
    const response = await supabaseFetch("/rest/v1/calendar_items?select=id,title,details,event_date,event_time,kind,completed,created_at&order=event_date.asc,event_time.asc.nullsfirst&limit=500");
    if (!response.ok) {
      if (response.status === 404) return Response.json({ items: [], configured: false });
      throw new Error(`Supabase ${response.status}`);
    }
    return Response.json({ items: await response.json(), configured: true });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") {
      return Response.json({ items: [], configured: false });
    }
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const details = String(body.details ?? "").trim();
    const eventDate = String(body.eventDate ?? "").trim();
    const eventTimeRaw = String(body.eventTime ?? "").trim();
    const kind = String(body.kind ?? "event").trim();
    const uploadCode = String(body.uploadCode ?? "");

    if (!uploadCodeMatches(uploadCode)) return Response.json({ error: "La clave de nuestro álbum no es correcta." }, { status: 403 });
    if (!title || title.length > 100) return Response.json({ error: "Escribe un título de hasta 100 caracteres." }, { status: 400 });
    if (details.length > 500) return Response.json({ error: "Los detalles pueden tener hasta 500 caracteres." }, { status: 400 });
    if (!DATE_RE.test(eventDate)) return Response.json({ error: "Selecciona una fecha válida." }, { status: 400 });
    if (eventTimeRaw && !TIME_RE.test(eventTimeRaw)) return Response.json({ error: "Selecciona una hora válida." }, { status: 400 });
    if (!ALLOWED_KINDS.has(kind)) return Response.json({ error: "Selecciona un tipo válido." }, { status: 400 });

    const insert = await supabaseFetch("/rest/v1/calendar_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        title,
        details,
        event_date: eventDate,
        event_time: eventTimeRaw || null,
        kind,
        completed: false,
      }),
    });
    if (!insert.ok) throw new Error(`Supabase ${insert.status}`);
    const rows = (await insert.json()) as unknown[];
    return Response.json({ item: rows[0] }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);
    const completed = Boolean(body.completed);
    const uploadCode = String(body.uploadCode ?? "");

    if (!uploadCodeMatches(uploadCode)) return Response.json({ error: "La clave de nuestro álbum no es correcta." }, { status: 403 });
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "La tarea no es válida." }, { status: 400 });

    const update = await supabaseFetch(`/rest/v1/calendar_items?id=eq.${id}&kind=eq.task`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ completed }),
    });
    if (!update.ok) throw new Error(`Supabase ${update.status}`);
    const rows = (await update.json()) as unknown[];
    if (!rows.length) return Response.json({ error: "No encontramos esa tarea." }, { status: 404 });
    return Response.json({ item: rows[0] });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);
    const uploadCode = String(body.uploadCode ?? "");

    if (!uploadCodeMatches(uploadCode)) return Response.json({ error: "La clave de nuestro álbum no es correcta." }, { status: 403 });
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "El elemento no es válido." }, { status: 400 });

    const remove = await supabaseFetch(`/rest/v1/calendar_items?id=eq.${id}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    if (!remove.ok) throw new Error(`Supabase ${remove.status}`);
    return Response.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
