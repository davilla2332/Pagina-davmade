import { apiError, supabaseFetch, uploadCodeMatches } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function panamaDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Panama",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

type CapsuleRow = {
  id: number;
  title: string;
  author: string;
  message: string;
  open_date: string;
  created_at: string;
};

function publicCapsule(row: CapsuleRow) {
  const canOpen = row.open_date <= panamaDateKey();
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    open_date: row.open_date,
    created_at: row.created_at,
    can_open: canOpen,
    ...(canOpen ? { message: row.message } : {}),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const idRaw = url.searchParams.get("id");

    if (idRaw) {
      const id = Number(idRaw);
      if (!Number.isInteger(id) || id <= 0) {
        return Response.json({ error: "La cápsula no es válida." }, { status: 400 });
      }

      const response = await supabaseFetch(`/rest/v1/time_capsules?id=eq.${id}&select=id,title,author,message,open_date,created_at&limit=1`);
      if (!response.ok) {
        if (response.status === 404) return Response.json({ error: "La cápsula del tiempo todavía no está configurada.", configured: false }, { status: 503 });
        throw new Error(`Supabase ${response.status}`);
      }
      const rows = (await response.json()) as CapsuleRow[];
      if (!rows.length) return Response.json({ error: "No encontramos esa cápsula." }, { status: 404 });
      const capsule = publicCapsule(rows[0]);
      if (!capsule.can_open) {
        return Response.json({ error: `Esta cápsula permanecerá bloqueada hasta el ${rows[0].open_date}.`, openDate: rows[0].open_date, locked: true }, { status: 423 });
      }
      return Response.json({ capsule, configured: true });
    }

    const response = await supabaseFetch("/rest/v1/time_capsules?select=id,title,author,message,open_date,created_at&order=open_date.asc,created_at.desc&limit=100");
    if (!response.ok) {
      if (response.status === 404) return Response.json({ capsules: [], configured: false });
      throw new Error(`Supabase ${response.status}`);
    }
    const rows = (await response.json()) as CapsuleRow[];
    return Response.json({ capsules: rows.map(publicCapsule), configured: true });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") {
      return Response.json({ capsules: [], configured: false });
    }
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const author = String(body.author ?? "").trim();
    const message = String(body.message ?? "").trim();
    const openDate = String(body.openDate ?? "").trim();
    const uploadCode = String(body.uploadCode ?? "");

    if (!uploadCodeMatches(uploadCode)) {
      return Response.json({ error: "La clave de nuestro álbum no es correcta." }, { status: 403 });
    }
    if (!title || title.length > 100) {
      return Response.json({ error: "Escribe un título de hasta 100 caracteres." }, { status: 400 });
    }
    if (!author || author.length > 60) {
      return Response.json({ error: "Escribe quién dejó el mensaje, usando hasta 60 caracteres." }, { status: 400 });
    }
    if (!message || message.length > 4000) {
      return Response.json({ error: "El mensaje debe tener entre 1 y 4000 caracteres." }, { status: 400 });
    }
    if (!DATE_RE.test(openDate)) {
      return Response.json({ error: "Selecciona una fecha de apertura válida." }, { status: 400 });
    }
    if (openDate < panamaDateKey()) {
      return Response.json({ error: "La fecha de apertura no puede estar en el pasado." }, { status: 400 });
    }

    const insert = await supabaseFetch("/rest/v1/time_capsules", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ title, author, message, open_date: openDate }),
    });
    if (!insert.ok) throw new Error(`Supabase ${insert.status}`);
    const rows = (await insert.json()) as CapsuleRow[];
    return Response.json({ capsule: publicCapsule(rows[0]) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);
    const uploadCode = String(body.uploadCode ?? "");

    if (!uploadCodeMatches(uploadCode)) {
      return Response.json({ error: "La clave de nuestro álbum no es correcta." }, { status: 403 });
    }
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "La cápsula no es válida." }, { status: 400 });
    }

    const remove = await supabaseFetch(`/rest/v1/time_capsules?id=eq.${id}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    if (!remove.ok) throw new Error(`Supabase ${remove.status}`);
    return Response.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
