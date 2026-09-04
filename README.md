# Nuestra Historia — David y Madeline

Página romántica preparada para guardar permanentemente la respuesta **“Sí”** y las fotografías del álbum mediante Supabase.

## Qué incluye

- Propuesta con carta romántica.
- Contadores desde el 12 de julio, el 16 de agosto y desde el “Sí”.
- Línea de tiempo de la historia.
- Álbum con título, leyenda y fotografías.
- Clave privada para autorizar nuevas fotos.
- Diseño adaptable a computadoras y celulares.
- Configuración limpia para GitHub, Vercel y Supabase.

## Arquitectura

GitHub guarda el código. Vercel ejecuta la página y sus rutas privadas de servidor. Supabase guarda la fecha de aceptación, los datos del álbum y las fotografías.

La clave secreta de Supabase y la clave del álbum nunca se incluyen en GitHub ni se envían al navegador.

## 1. Preparar Supabase

1. Crea o abre tu proyecto en <https://supabase.com/dashboard>.
2. Entra en **SQL Editor**.
3. Abre `supabase/setup.sql`, copia todo su contenido y ejecútalo una sola vez.
4. En Supabase, abre **Project Settings > API Keys**.
5. Copia el **Project URL**.
6. En **Secret keys**, crea o copia una clave que comience por `sb_secret_`.

También funciona temporalmente con la clave antigua `service_role`, pero se recomienda usar una nueva Secret key.

## 2. Probar en Windows

Necesitas Node.js 22 o superior. Abre una terminal dentro de esta carpeta y ejecuta:

```bat
npm install
copy .env.example .env.local
```

Abre `.env.local` y completa:

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_TU_CLAVE_SECRETA
ALBUM_UPLOAD_CODE=LA_CLAVE_QUE_USARAN_PARA_SUBIR_FOTOS
```

Inicia la página:

```bat
npm run dev
```

Abre <http://localhost:3000>.

## 3. Subir el proyecto a GitHub

Crea un repositorio vacío y ejecuta estos comandos desde la carpeta del proyecto:

```bat
git init
git add .
git commit -m "Primera versión de nuestra historia"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

No subas `.env.local`. El archivo `.gitignore` ya lo excluye automáticamente.

## 4. Publicar con Vercel

1. Entra en <https://vercel.com/new> y conecta tu cuenta de GitHub.
2. Selecciona el repositorio y pulsa **Import**.
3. Vercel detectará **Next.js** automáticamente.
4. Antes de publicar, abre **Environment Variables** y agrega:

| Nombre | Valor |
| --- | --- |
| `SUPABASE_URL` | La URL de tu proyecto Supabase |
| `SUPABASE_SECRET_KEY` | Tu clave `sb_secret_...` |
| `ALBUM_UPLOAD_CODE` | La clave elegida para subir fotografías |

5. Marca las variables para **Production**, **Preview** y **Development**.
6. Pulsa **Deploy**.

Cada cambio que envíes a la rama `main` de GitHub se volverá a publicar automáticamente.

## Seguridad

- Nunca copies `SUPABASE_SECRET_KEY` dentro de `app/`, `public/` ni GitHub.
- No agregues el prefijo `NEXT_PUBLIC_` a una clave privada.
- Si una clave secreta aparece en una captura o repositorio, elimínala y rótala inmediatamente en Supabase.
- El formulario acepta imágenes JPG, PNG, WEBP o AVIF de hasta 4 MB.

## Cambiar nombres o fechas

Los nombres, textos y fechas principales están en `app/page.tsx`:

```ts
const STARTED_TALKING = new Date("2026-07-12T00:00:00-05:00");
const FIRST_MEETING = new Date("2026-08-16T00:00:00-05:00");
```

Después de modificar el proyecto, verifica que compile:

```bat
npm run build
```
