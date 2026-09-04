"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STARTED_TALKING = new Date("2026-07-12T00:00:00-05:00");
const FIRST_MEETING = new Date("2026-08-16T00:00:00-05:00");

type Elapsed = { days: number; hours: number; minutes: number; seconds: number };
type Memory = { id: number; title: string; caption: string; photo_url: string; created_at: string };

function elapsedSince(date: Date | null): Elapsed {
  if (!date) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const total = Math.max(0, Date.now() - date.getTime());
  return {
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total / 3_600_000) % 24),
    minutes: Math.floor((total / 60_000) % 60),
    seconds: Math.floor((total / 1_000) % 60),
  };
}

function TimeCounter({ date, label, eyebrow, accent = false }: { date: Date | null; label: string; eyebrow: string; accent?: boolean }) {
  const [elapsed, setElapsed] = useState(() => elapsedSince(date));

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(elapsedSince(date)), 1000);
    return () => window.clearInterval(timer);
  }, [date]);

  return (
    <article className={`counter-card ${accent ? "counter-card--accent" : ""}`}>
      <p className="counter-eyebrow">{eyebrow}</p>
      <h3>{label}</h3>
      <div className="counter-grid" aria-label={`${elapsed.days} días, ${elapsed.hours} horas, ${elapsed.minutes} minutos y ${elapsed.seconds} segundos`}>
        {([[elapsed.days, "días"], [elapsed.hours, "horas"], [elapsed.minutes, "min"], [elapsed.seconds, "seg"]] as const).map(([value, unit]) => (
          <div className="counter-unit" key={unit}>
            <strong>{String(value).padStart(2, "0")}</strong>
            <span>{unit}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="heart-icon">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export default function Home() {
  const [acceptedAt, setAcceptedAt] = useState<Date | null>(null);
  const [showLetter, setShowLetter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [albumLoading, setAlbumLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [albumMessage, setAlbumMessage] = useState("");
  const [storageReady, setStorageReady] = useState(true);
  const noButtonRef = useRef<HTMLButtonElement>(null);
  const albumFormRef = useRef<HTMLFormElement>(null);
  const firstMeetingLabel = useMemo(() => new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "long", year: "numeric" }).format(FIRST_MEETING), []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/proposal").then((response) => response.json()),
      fetch("/api/memories").then((response) => response.json()),
    ]).then(([proposal, album]) => {
      if (!active) return;
      if (proposal.acceptedAt) setAcceptedAt(new Date(proposal.acceptedAt));
      if (Array.isArray(album.memories)) setMemories(album.memories);
      const configured = proposal.configured !== false && album.configured !== false;
      setStorageReady(configured);
      if (!configured) setAlbumMessage("El álbum está listo; solo falta conectar las credenciales de Supabase.");
    }).catch(() => {
      if (active) setAlbumMessage("No pudimos cargar el álbum en este momento.");
    }).finally(() => {
      if (active) setAlbumLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function sayYes() {
    if (saving || acceptedAt) { setShowLetter(true); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/proposal", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAcceptedAt(new Date(result.acceptedAt));
    } catch {
      setAcceptedAt(new Date());
      setStorageReady(false);
      setAlbumMessage("Tu respuesta se muestra ahora, pero se guardará para siempre cuando conectemos Supabase.");
    } finally {
      setSaving(false);
      setShowLetter(true);
    }
  }

  async function uploadMemory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    setUploading(true);
    setAlbumMessage("");
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/memories", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos guardar la foto.");
      setMemories((current) => [result.memory as Memory, ...current]);
      albumFormRef.current?.reset();
      setAlbumMessage("El recuerdo se guardó en nuestro álbum ♡");
    } catch (error) {
      setAlbumMessage(error instanceof Error ? error.message : "No pudimos guardar la foto.");
    } finally {
      setUploading(false);
    }
  }

  function dodgeNo() {
    const button = noButtonRef.current;
    if (!button || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    button.style.transform = `translate(${Math.round((Math.random() - 0.5) * 110)}px, ${Math.round((Math.random() - 0.5) * 55)}px)`;
  }

  return (
    <main>
      <nav className="nav-shell" aria-label="Navegación principal">
        <a className="brand" href="#inicio" aria-label="Ir al inicio"><span className="brand-mark"><HeartIcon filled /></span><span>David <i>&</i> Madeline</span></a>
        <div className="nav-links"><a href="#historia">Nuestra historia</a><a href="#momentos">Momentos</a></div>
      </nav>

      <section className="hero" id="inicio">
        <div className="ambient ambient-one" /><div className="ambient ambient-two" />
        <div className="hero-copy">
          <p className="overline"><span /> 12 JUL — EL DÍA QUE TODO EMPEZÓ <span /></p>
          <h1>Hay preguntas que<br />cambian una <em>historia.</em></h1>
          <p className="hero-intro">Desde aquel primer mensaje, cada llamada, cada sonrisa y cada instante contigo me trajeron hasta aquí.</p>
          <div className="proposal-card">
            <p>MADELINE, TENGO ALGO QUE PREGUNTARTE…</p>
            <h2>¿Quieres ser mi novia?</h2>
            <div className="proposal-actions">
              <button className="yes-button" onClick={sayYes} disabled={saving}><HeartIcon filled /> {saving ? "Guardando este momento…" : acceptedAt ? "Sí, una y mil veces" : "Sí, quiero"}</button>
              {!acceptedAt && <button ref={noButtonRef} className="no-button" onPointerEnter={dodgeNo} onFocus={dodgeNo} onClick={dodgeNo}>Déjame pensarlo</button>}
            </div>
            <span className="proposal-note">Sin presión… pero mi corazón ya sabe la respuesta ♡</span>
          </div>
        </div>

        <aside className="date-card" aria-label="Fecha de nuestro primer encuentro">
          <span className="date-card__small">NUESTRO PRIMER ENCUENTRO</span><strong>16</strong><em>AGOSTO</em><span className="date-card__year">2026</span><p>{firstMeetingLabel}</p>
        </aside>
        <a className="scroll-cue" href="#historia" aria-label="Continuar a nuestra historia"><span>DESCUBRE NUESTRA HISTORIA</span><i>↓</i></a>
      </section>

      <section className="story-section" id="historia">
        <div className="section-heading">
          <p className="overline"><span /> NUESTRO TIEMPO JUNTOS <span /></p><h2>Cada segundo nos trajo hasta aquí</h2><p>Tres momentos, una misma historia y todo lo que todavía nos queda por vivir.</p>
        </div>
        <div className="counter-list">
          <TimeCounter date={STARTED_TALKING} eyebrow="DESDE EL PRIMER MENSAJE" label="Empezamos a hablar" />
          <TimeCounter date={FIRST_MEETING} eyebrow="DESDE QUE TE VI" label="Nuestro primer encuentro" accent />
          <TimeCounter key={acceptedAt?.toISOString() ?? "waiting"} date={acceptedAt} eyebrow="NUESTRO NUEVO COMIENZO" label={acceptedAt ? "Desde que dijiste que sí" : "Esperando tu sí"} />
        </div>
      </section>

      <section className="timeline-section" aria-label="Línea de tiempo de nuestra historia">
        <div className="timeline-intro">
          <p className="overline"><span /> ASÍ COMENZÓ LO NUESTRO</p>
          <h2>Cuatro capítulos y miles por escribir</h2>
        </div>
        <div className="timeline">
          <article><span>01</span><p>12 DE JULIO</p><h3>El primer mensaje</h3><small>Una conversación sencilla que terminó cambiando nuestros días.</small></article>
          <article><span>02</span><p>CADA DÍA</p><h3>Nuestras llamadas</h3><small>Tu voz se convirtió en ese lugar al que siempre quiero volver.</small></article>
          <article><span>03</span><p>16 DE AGOSTO</p><h3>Por fin, frente a frente</h3><small>Tu sonrisa y tu mirada hicieron que todo se sintiera todavía más real.</small></article>
          <article><span>04</span><p>HOY</p><h3>Un nuevo comienzo</h3><small>La pregunta que abre la puerta a todo lo bonito que soñamos vivir.</small></article>
        </div>
      </section>

      <section className="moments-section" id="momentos">
        <div className="section-heading moments-heading">
          <p className="overline"><span /> PEQUEÑOS INSTANTES, GRANDES RECUERDOS <span /></p><h2>Nuestros momentos</h2><p>Un álbum vivo para guardar las fotos, fechas y palabras que nunca queremos olvidar.</p>
        </div>

        <div className="album-layout">
          <aside className="upload-card">
            <div className="upload-card__top"><span><HeartIcon /></span><div><p>AGREGAR UN RECUERDO</p><h3>Una foto para nuestra historia</h3></div></div>
            <form ref={albumFormRef} onSubmit={uploadMemory}>
              <label className="file-drop">
                <input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required />
                <span className="file-drop__icon">＋</span>
                <strong>Elige una foto</strong>
                <small>JPG, PNG, WEBP o AVIF · máximo 4 MB</small>
              </label>
              <label><span>Título</span><input name="title" maxLength={80} placeholder="Ej. Nuestro primer paseo" required /></label>
              <label><span>Leyenda</span><textarea name="caption" maxLength={300} rows={4} placeholder="¿Qué hizo especial este momento?" /></label>
              <label><span>Clave de nuestro álbum</span><input name="uploadCode" type="password" autoComplete="off" placeholder="Solo nosotros la conocemos" required /></label>
              <button className="upload-button" type="submit" disabled={uploading || !storageReady}>{uploading ? "Guardando recuerdo…" : "Guardar en nuestro álbum"}<span>♡</span></button>
            </form>
            {albumMessage && <p className={`album-message ${storageReady ? "" : "album-message--setup"}`} role="status">{albumMessage}</p>}
          </aside>

          <div className="album-gallery" aria-live="polite">
            {albumLoading ? (
              <div className="album-empty"><span>♡</span><h3>Abriendo nuestro álbum…</h3></div>
            ) : memories.length ? memories.map((memory, index) => (
              <article className={`memory-card ${index % 3 === 1 ? "memory-card--tall" : ""}`} key={memory.id}>
                <div className="memory-photo">
                  {/* Remote Supabase images have dynamic hostnames, so a native image is intentional here. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={memory.photo_url} alt={memory.title} loading="lazy" />
                </div>
                <div className="memory-copy"><p>{new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(memory.created_at))}</p><h3>{memory.title}</h3>{memory.caption && <span>{memory.caption}</span>}</div>
              </article>
            )) : (
              <div className="album-empty"><span>♡</span><h3>Nuestro álbum comienza aquí</h3><p>La primera foto que subamos será la primera página de muchos recuerdos juntos.</p></div>
            )}
          </div>
        </div>
      </section>

      <footer><span><HeartIcon filled /></span><p>Hecho con amor para Madeline</p><small>David & Madeline · Nuestra historia apenas comienza</small></footer>

      {showLetter && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowLetter(false)}>
          <section className="letter-modal" role="dialog" aria-modal="true" aria-labelledby="letter-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLetter(false)} aria-label="Cerrar carta">×</button>
            <p className="letter-kicker">PARA TI, MADELINE</p><h2 id="letter-title">El comienzo de nuestro para siempre</h2>
            <div className="letter-body">
              <p>Mi amor,</p>
              <p>El 12 de julio comenzó algo que en ese momento parecía tan sencillo como una conversación, pero que poco a poco se convirtió en una de las partes más bonitas de mis días.</p>
              <p>Desde entonces hemos hablado a diario. Entre llamadas largas, risas inesperadas y esos silencios que también se sienten cómodos, tu voz se volvió mi sonido favorito. Me encanta escucharte, saber cómo fue tu día y descubrir un poquito más de ti cada vez.</p>
              <p>Y entonces llegó el 16 de agosto. Verte por primera vez hizo real todo lo que ya sentía. Tu sonrisa iluminó ese momento; tu mirada me dio esa mezcla de calma y emoción que todavía no sé explicar. Ese día confirmé que no solo me gustaba hablar contigo: quería vivir historias contigo.</p>
              <p>Amo tu voz, tu sonrisa y la forma en que tu mirada parece detener el tiempo. Pero, sobre todo, amo cómo me siento cuando estoy contigo: afortunado, feliz y con ganas de construir algo bonito, sincero y nuestro.</p>
              <p>Hoy no quiero prometerte una historia perfecta; quiero prometerte presencia, cuidado, risas, conversación y la decisión de elegirnos cada día. Gracias por llegar a mi vida y por decir que sí.</p>
              <p className="letter-signature">Con todo mi corazón,<br /><strong>David</strong></p>
            </div>
            <button className="letter-continue" onClick={() => { setShowLetter(false); document.querySelector("#momentos")?.scrollIntoView({ behavior: "smooth" }); }}>Ver nuestros momentos <span>→</span></button>
          </section>
        </div>
      )}
    </main>
  );
}
