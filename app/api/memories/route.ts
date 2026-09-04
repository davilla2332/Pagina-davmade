import { apiError, publicPhotoUrl, supabaseFetch, uploadCodeMatches } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

// Vercel Functions admite solicitudes de hasta 4.5 MB. Dejamos margen para
// los campos del formulario y el encabezado multipart.
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function GET() {
  try {
    const response = await supabaseFetch("/rest/v1/memories?select=id,title,caption,photo_url,created_at&order=created_at.desc&limit=60");
    if (!response.ok) throw new Error(`Supabase ${response.status}`);
    return Response.json({ memories: await response.json(), configured: true });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") {
      return Response.json({ memories: [], configured: false });
    }
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const title = String(data.get("title") ?? "").trim();
    const caption = String(data.get("caption") ?? "").trim();
    const uploadCode = String(data.get("uploadCode") ?? "");
    const photo = data.get("photo");

    if (!uploadCodeMatches(uploadCode)) return Response.json({ error: "La clave del álbum no es correcta." }, { status: 403 });
    if (!title || title.length > 80) return Response.json({ error: "Escribe un título de hasta 80 caracteres." }, { status: 400 });
    if (caption.length > 300) return Response.json({ error: "La leyenda puede tener hasta 300 caracteres." }, { status: 400 });
    if (!(photo instanceof File)) return Response.json({ error: "Selecciona una foto." }, { status: 400 });
    if (!ALLOWED_TYPES.has(photo.type)) return Response.json({ error: "Usa una imagen JPG, PNG, WEBP o AVIF." }, { status: 400 });
    if (photo.size > MAX_FILE_BYTES) return Response.json({ error: "La imagen no puede superar 4 MB." }, { status: 400 });

    const extension = photo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const storagePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabaseFetch(`/storage/v1/object/couple-photos/${storagePath}`, {
      method: "POST",
      headers: { "Content-Type": photo.type, "x-upsert": "false" },
      body: await photo.arrayBuffer(),
    });
    if (!upload.ok) throw new Error(`Storage ${upload.status}`);

    const photoUrl = publicPhotoUrl(storagePath);
    const insert = await supabaseFetch("/rest/v1/memories", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ title, caption, photo_url: photoUrl, storage_path: storagePath }),
    });
    if (!insert.ok) throw new Error(`Supabase ${insert.status}`);
    const rows = (await insert.json()) as unknown[];
    return Response.json({ memory: rows[0] }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
