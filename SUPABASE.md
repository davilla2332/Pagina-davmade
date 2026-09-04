# Conexión con Supabase

## Paso 1: crear tablas y almacenamiento

En Supabase, abre **SQL Editor**, pega el contenido completo de `supabase/setup.sql` y pulsa **Run**.

El script crea:

- `relationship_state`: guarda una sola fecha para el “Sí”.
- `memories`: guarda título, leyenda y dirección de cada fotografía.
- `couple-photos`: bucket público para mostrar las imágenes del álbum.

Las tablas tienen RLS activado y no permiten escritura anónima directa.

## Paso 2: obtener las credenciales

En **Project Settings > API Keys**, copia:

- **Project URL** para `SUPABASE_URL`.
- Una **Secret key** `sb_secret_...` para `SUPABASE_SECRET_KEY`.

Estas credenciales se colocan en `.env.local` solamente durante el desarrollo y en las variables privadas de Vercel durante la publicación.

## Paso 3: elegir la clave del álbum

`ALBUM_UPLOAD_CODE` puede ser una contraseña que solo conozcan David y Madeline. No se guarda en Supabase ni en GitHub; Vercel la compara dentro del servidor antes de aceptar una fotografía.

## Compatibilidad con claves antiguas

Si tu proyecto todavía no ofrece Secret keys, puedes utilizar la clave `service_role` como `SUPABASE_SERVICE_ROLE_KEY`. No configures ambas a la vez y nunca la publiques.
