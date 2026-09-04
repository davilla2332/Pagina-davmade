type SiteSecrets = {
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ALBUM_UPLOAD_CODE?: string;
};

function secrets(): SiteSecrets {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ALBUM_UPLOAD_CODE: process.env.ALBUM_UPLOAD_CODE,
  };
}

function serverKey(config: SiteSecrets) {
  return config.SUPABASE_SECRET_KEY || config.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured() {
  const config = secrets();
  return Boolean(config.SUPABASE_URL && serverKey(config));
}

export function uploadCodeMatches(code: string) {
  const expected = secrets().ALBUM_UPLOAD_CODE;
  return Boolean(expected && code && code === expected);
}

export async function supabaseFetch(path: string, init: RequestInit = {}) {
  const config = secrets();
  const key = serverKey(config);
  if (!config.SUPABASE_URL || !key) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  // Las claves service_role antiguas son JWT. Las nuevas sb_secret_ usan
  // solamente el encabezado apikey y nunca deben enviarse al navegador.
  if (key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${key}`);
  if (!headers.has("Content-Type") && !(init.body instanceof FormData) && init.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${config.SUPABASE_URL.replace(/\/$/, "")}${path}`, { ...init, headers });
}

export function publicPhotoUrl(storagePath: string) {
  const config = secrets();
  if (!config.SUPABASE_URL) throw new Error("SUPABASE_NOT_CONFIGURED");
  return `${config.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/couple-photos/${storagePath}`;
}

export function apiError(error: unknown) {
  if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") {
    return Response.json({ error: "Supabase todavía no está configurado.", code: "NOT_CONFIGURED" }, { status: 503 });
  }
  console.error("Error al comunicarse con Supabase:", error);
  return Response.json({ error: "No pudimos completar la solicitud. Inténtalo nuevamente." }, { status: 500 });
}
