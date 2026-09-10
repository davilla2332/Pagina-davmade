"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STARTED_TALKING = new Date("2026-07-12T00:00:00-05:00");
const FIRST_MEETING = new Date("2026-08-16T00:00:00-05:00");

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type Elapsed = { days: number; hours: number; minutes: number; seconds: number };
type Memory = { id: number; title: string; caption: string; photo_url: string; created_at: string };
type CalendarKind = "event" | "task" | "plan" | "note";
type CalendarItem = {
  id: number;
  title: string;
  details: string;
  event_date: string;
  event_time: string | null;
  kind: CalendarKind;
  completed: boolean;
  created_at: string;
};
type DisplayCalendarItem = Omit<CalendarItem, "id"> & { id: string; system?: boolean };
type Capsule = {
  id: number;
  title: string;
  author: string;
  open_date: string;
  created_at: string;
  can_open: boolean;
  message?: string;
};
type DashboardFilter = "all" | CalendarKind;

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

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function daysUntilDate(key: string) {
  const today = new Date();
  const todayAtNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
  return Math.max(0, Math.ceil((parseDateKey(key).getTime() - todayAtNoon.getTime()) / 86_400_000));
}

function formatLongDate(key: string) {
  return new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "long", year: "numeric" }).format(parseDateKey(key));
}

function calendarKindLabel(kind: CalendarKind) {
  return ({ event: "Acontecimiento", task: "Tarea", plan: "Idea o plan", note: "Nota" } as const)[kind];
}

function calendarKindIcon(kind: CalendarKind) {
  return ({ event: "♥", task: "✓", plan: "✦", note: "✎" } as const)[kind];
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarReady, setCalendarReady] = useState(true);
  const [calendarMessage, setCalendarMessage] = useState("");
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>("all");
  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => toDateKey(new Date()));
  const [calendarSaving, setCalendarSaving] = useState(false);

  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [capsuleLoading, setCapsuleLoading] = useState(true);
  const [capsuleReady, setCapsuleReady] = useState(true);
  const [capsuleMessage, setCapsuleMessage] = useState("");
  const [showCapsuleForm, setShowCapsuleForm] = useState(false);
  const [capsuleSaving, setCapsuleSaving] = useState(false);
  const [openedCapsule, setOpenedCapsule] = useState<Capsule | null>(null);

  const noButtonRef = useRef<HTMLButtonElement>(null);
  const albumFormRef = useRef<HTMLFormElement>(null);
  const calendarFormRef = useRef<HTMLFormElement>(null);
  const capsuleFormRef = useRef<HTMLFormElement>(null);
  const firstMeetingLabel = useMemo(() => new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "long", year: "numeric" }).format(FIRST_MEETING), []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/proposal").then((response) => response.json()),
      fetch("/api/memories").then((response) => response.json()),
      fetch("/api/calendar").then((response) => response.json()),
    ]).then(([proposal, album, calendar]) => {
      if (!active) return;
      if (proposal.acceptedAt) setAcceptedAt(new Date(proposal.acceptedAt));
      if (Array.isArray(album.memories)) setMemories(album.memories);
      if (Array.isArray(calendar.items)) setCalendarItems(calendar.items);

      const configured = proposal.configured !== false && album.configured !== false;
      setStorageReady(configured);
      if (!configured) setAlbumMessage("El álbum está listo; solo falta conectar las credenciales de Supabase.");

      const calendarConfigured = calendar.configured !== false;
      setCalendarReady(calendarConfigured);
      if (!calendarConfigured) setCalendarMessage("El tablero está listo; solo falta ejecutar la actualización de Supabase.");
    }).catch(() => {
      if (!active) return;
      setAlbumMessage("No pudimos cargar el álbum en este momento.");
      setCalendarMessage("No pudimos cargar el tablero en este momento.");
    }).finally(() => {
      if (!active) return;
      setAlbumLoading(false);
      setCalendarLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/capsules")
      .then((response) => response.json())
      .then((result) => {
        if (!active) return;
        if (Array.isArray(result.capsules)) setCapsules(result.capsules);
        const configured = result.configured !== false;
        setCapsuleReady(configured);
        if (!configured) setCapsuleMessage("La cápsula del tiempo está lista; solo falta ejecutar la actualización de Supabase.");
      })
      .catch(() => {
        if (!active) return;
        setCapsuleMessage("No pudimos cargar las cápsulas del tiempo en este momento.");
      })
      .finally(() => {
        if (active) setCapsuleLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

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
      setPreviewUrl(null);
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

  const systemCalendarItems = useMemo<DisplayCalendarItem[]>(() => {
    const base: DisplayCalendarItem[] = [
      {
        id: "system-start",
        title: "El día que empezamos a hablar",
        details: "El primer capítulo de nuestra historia.",
        event_date: toDateKey(STARTED_TALKING),
        event_time: null,
        kind: "event",
        completed: false,
        created_at: STARTED_TALKING.toISOString(),
        system: true,
      },
      {
        id: "system-meeting",
        title: "Nuestro primer encuentro",
        details: "La primera vez que estuvimos frente a frente.",
        event_date: toDateKey(FIRST_MEETING),
        event_time: null,
        kind: "event",
        completed: false,
        created_at: FIRST_MEETING.toISOString(),
        system: true,
      },
    ];
    if (acceptedAt) {
      base.push({
        id: "system-yes",
        title: "El día que dijiste que sí",
        details: "Nuestro nuevo comienzo como novios.",
        event_date: toDateKey(acceptedAt),
        event_time: null,
        kind: "event",
        completed: false,
        created_at: acceptedAt.toISOString(),
        system: true,
      });
    }
    return base;
  }, [acceptedAt]);

  const allCalendarItems = useMemo<DisplayCalendarItem[]>(() => [
    ...systemCalendarItems,
    ...calendarItems.map((item) => ({ ...item, id: String(item.id) })),
  ], [systemCalendarItems, calendarItems]);

  const filteredCalendarItems = useMemo(() => {
    return dashboardFilter === "all" ? allCalendarItems : allCalendarItems.filter((item) => item.kind === dashboardFilter);
  }, [allCalendarItems, dashboardFilter]);

  const monthCells = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = toDateKey(date);
      return {
        date,
        key,
        currentMonth: date.getMonth() === month,
        items: filteredCalendarItems.filter((item) => item.event_date === key),
      };
    });
  }, [calendarCursor, filteredCalendarItems]);

  const upcomingItems = useMemo(() => {
    const today = toDateKey(new Date());
    return [...allCalendarItems]
      .filter((item) => item.event_date >= today && !(item.kind === "task" && item.completed))
      .sort((a, b) => `${a.event_date} ${a.event_time || "00:00"}`.localeCompare(`${b.event_date} ${b.event_time || "00:00"}`))
      .slice(0, 6);
  }, [allCalendarItems]);

  const pendingTaskCount = calendarItems.filter((item) => item.kind === "task" && !item.completed).length;
  const planCount = calendarItems.filter((item) => item.kind === "plan" || item.kind === "note").length;
  const importantCount = systemCalendarItems.length + calendarItems.filter((item) => item.kind === "event").length;

  function openCalendarForm(dateKey?: string) {
    setSelectedCalendarDate(dateKey || toDateKey(new Date()));
    setCalendarMessage("");
    setShowCalendarForm(true);
  }

  async function saveCalendarItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (calendarSaving) return;
    setCalendarSaving(true);
    setCalendarMessage("");
    try {
      const formData = new FormData(event.currentTarget);
      const payload = {
        title: String(formData.get("title") || ""),
        details: String(formData.get("details") || ""),
        eventDate: String(formData.get("eventDate") || ""),
        eventTime: String(formData.get("eventTime") || ""),
        kind: String(formData.get("kind") || "event"),
        uploadCode: String(formData.get("uploadCode") || ""),
      };
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos guardar este momento.");
      setCalendarItems((current) => [...current, result.item as CalendarItem]);
      calendarFormRef.current?.reset();
      setShowCalendarForm(false);
      setCalendarMessage("Guardado en nuestro tablero ♡");
    } catch (error) {
      setCalendarMessage(error instanceof Error ? error.message : "No pudimos guardar este momento.");
    } finally {
      setCalendarSaving(false);
    }
  }

  async function toggleCalendarTask(item: DisplayCalendarItem) {
    if (item.system || item.kind !== "task") return;
    const uploadCode = window.prompt("Clave de nuestro álbum para actualizar esta tarea:");
    if (!uploadCode) return;
    try {
      const response = await fetch("/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(item.id), completed: !item.completed, uploadCode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos actualizar la tarea.");
      setCalendarItems((current) => current.map((currentItem) => currentItem.id === Number(item.id) ? result.item : currentItem));
    } catch (error) {
      setCalendarMessage(error instanceof Error ? error.message : "No pudimos actualizar la tarea.");
    }
  }

  async function deleteCalendarItem(item: DisplayCalendarItem) {
    if (item.system) return;
    if (!window.confirm(`¿Eliminar “${item.title}” del tablero?`)) return;
    const uploadCode = window.prompt("Clave de nuestro álbum para eliminarlo:");
    if (!uploadCode) return;
    try {
      const response = await fetch("/api/calendar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(item.id), uploadCode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos eliminarlo.");
      setCalendarItems((current) => current.filter((currentItem) => currentItem.id !== Number(item.id)));
      setCalendarMessage("Elemento eliminado del tablero.");
    } catch (error) {
      setCalendarMessage(error instanceof Error ? error.message : "No pudimos eliminarlo.");
    }
  }

  async function saveCapsule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (capsuleSaving) return;
    setCapsuleSaving(true);
    setCapsuleMessage("");
    try {
      const formData = new FormData(event.currentTarget);
      const payload = {
        title: String(formData.get("title") || ""),
        author: String(formData.get("author") || ""),
        message: String(formData.get("message") || ""),
        openDate: String(formData.get("openDate") || ""),
        uploadCode: String(formData.get("uploadCode") || ""),
      };
      const response = await fetch("/api/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos sellar la cápsula.");
      setCapsules((current) => [result.capsule as Capsule, ...current]);
      capsuleFormRef.current?.reset();
      setShowCapsuleForm(false);
      setCapsuleMessage(`Cápsula sellada. Podrá abrirse el ${formatLongDate(result.capsule.open_date)} ♡`);
    } catch (error) {
      setCapsuleMessage(error instanceof Error ? error.message : "No pudimos sellar la cápsula.");
    } finally {
      setCapsuleSaving(false);
    }
  }

  async function openTimeCapsule(capsule: Capsule) {
    setCapsuleMessage("");
    try {
      const response = await fetch(`/api/capsules?id=${capsule.id}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Esta cápsula todavía no puede abrirse.");
      const opened = result.capsule as Capsule;
      setCapsules((current) => current.map((item) => item.id === opened.id ? { ...item, ...opened, can_open: true } : item));
      setOpenedCapsule(opened);
    } catch (error) {
      setCapsuleMessage(error instanceof Error ? error.message : "Esta cápsula todavía no puede abrirse.");
    }
  }

  async function deleteTimeCapsule(capsule: Capsule) {
    if (!window.confirm(`¿Eliminar la cápsula “${capsule.title}”? Esta acción no se puede deshacer.`)) return;
    const uploadCode = window.prompt("Escribe la clave de nuestro álbum para eliminar esta cápsula:");
    if (!uploadCode) return;
    try {
      const response = await fetch("/api/capsules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: capsule.id, uploadCode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos eliminar la cápsula.");
      setCapsules((current) => current.filter((item) => item.id !== capsule.id));
      setOpenedCapsule((current) => current?.id === capsule.id ? null : current);
      setCapsuleMessage("Cápsula eliminada.");
    } catch (error) {
      setCapsuleMessage(error instanceof Error ? error.message : "No pudimos eliminar la cápsula.");
    }
  }

  return (
    <main>
      <nav className="nav-shell" aria-label="Navegación principal">
        <a className="brand" href="#inicio" aria-label="Ir al inicio"><span className="brand-mark"><HeartIcon filled /></span><span>David <i>&</i> Madeline</span></a>
        <div className="nav-links"><a href="#historia">Nuestra historia</a><a href="#momentos">Momentos</a><a className="nav-tablero" href="#tablero">Tablero</a><a className="nav-capsule" href="#capsula">Cápsula</a></div>
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
        <a className="scroll-cue" href="#tablero" aria-label="Continuar a nuestro tablero"><span>ABRIR NUESTRO TABLERO</span><i>↓</i></a>
      </section>

      <section className="dashboard-section" id="tablero">
        <div className="dashboard-topline">
          <div>
            <p className="overline"><span /> NUESTRO ESPACIO PARA PLANEAR</p>
            <h2>Nuestro Tablero</h2>
            <p>Un lugar para recordar fechas, organizar tareas y guardar todo lo que queremos vivir juntos.</p>
          </div>
          <button className="dashboard-new" onClick={() => openCalendarForm()} disabled={!calendarReady}><span>＋</span>Nueva tarea o evento</button>
        </div>

        <div className="dashboard-shell">
          <aside className="dashboard-sidebar" aria-label="Filtros del tablero">
            <button className={dashboardFilter === "all" ? "active" : ""} onClick={() => setDashboardFilter("all")}><span>▣</span>Calendario</button>
            <button className={dashboardFilter === "task" ? "active" : ""} onClick={() => setDashboardFilter("task")}><span>✓</span>Mis tareas</button>
            <button className={dashboardFilter === "event" ? "active" : ""} onClick={() => setDashboardFilter("event")}><span>♡</span>Fechas importantes</button>
            <button className={dashboardFilter === "plan" ? "active" : ""} onClick={() => setDashboardFilter("plan")}><span>✦</span>Ideas y planes</button>
            <button className={dashboardFilter === "note" ? "active" : ""} onClick={() => setDashboardFilter("note")}><span>✎</span>Notas</button>
            <blockquote>“La vida es más bonita cuando la planeamos juntos.”<span>♡</span></blockquote>
          </aside>

          <div className="calendar-panel">
            <header className="calendar-toolbar">
              <div className="calendar-month-switcher">
                <button aria-label="Mes anterior" onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>‹</button>
                <h3>{MONTHS[calendarCursor.getMonth()]} {calendarCursor.getFullYear()}</h3>
                <button aria-label="Mes siguiente" onClick={() => setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>›</button>
              </div>
              <button className="calendar-today" onClick={() => { const now = new Date(); setCalendarCursor(new Date(now.getFullYear(), now.getMonth(), 1)); }}>Hoy</button>
            </header>

            <div className="calendar-grid calendar-weekdays">
              {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="calendar-grid calendar-days" aria-busy={calendarLoading}>
              {monthCells.map((cell) => (
                <button key={cell.key} className={`calendar-day ${cell.currentMonth ? "" : "calendar-day--muted"} ${cell.key === toDateKey(new Date()) ? "calendar-day--today" : ""}`} onDoubleClick={() => openCalendarForm(cell.key)} onClick={() => setSelectedCalendarDate(cell.key)}>
                  <span className="calendar-day__number">{cell.date.getDate()}</span>
                  <div className="calendar-day__items">
                    {cell.items.slice(0, 3).map((item) => (
                      <span key={item.id} className={`calendar-chip calendar-chip--${item.kind} ${item.completed ? "calendar-chip--done" : ""}`} title={item.title}>
                        <i>{calendarKindIcon(item.kind)}</i>{item.title}
                      </span>
                    ))}
                    {cell.items.length > 3 && <small>+{cell.items.length - 3} más</small>}
                  </div>
                </button>
              ))}
            </div>
            <p className="calendar-help">Consejo: haz doble clic sobre un día para agregar algo directamente en esa fecha.</p>
          </div>

          <aside className="dashboard-right">
            <div className="dashboard-quote">“Pequeños planes,<br />grandes historias” <span>♡</span></div>
            <div className="upcoming-card">
              <div className="upcoming-card__head"><h3>Próximos eventos</h3><button onClick={() => setDashboardFilter("all")}>Ver todos →</button></div>
              <div className="upcoming-list">
                {calendarLoading ? <p className="upcoming-empty">Cargando nuestro calendario…</p> : upcomingItems.length ? upcomingItems.map((item) => {
                  const date = parseDateKey(item.event_date);
                  return (
                    <article key={item.id} className={item.completed ? "upcoming-item upcoming-item--done" : "upcoming-item"}>
                      <div className={`upcoming-date upcoming-date--${item.kind}`}><span>{MONTHS[date.getMonth()].slice(0, 3).toUpperCase()}</span><strong>{date.getDate()}</strong></div>
                      <div className="upcoming-copy"><p><span>{calendarKindIcon(item.kind)}</span>{item.title}</p><small>{item.event_time ? item.event_time.slice(0, 5) : "Todo el día"} · {calendarKindLabel(item.kind)}</small></div>
                      <div className="upcoming-actions">
                        {item.kind === "task" && !item.system && <button title={item.completed ? "Marcar pendiente" : "Marcar completada"} onClick={() => toggleCalendarTask(item)}>{item.completed ? "↶" : "✓"}</button>}
                        {!item.system && <button title="Eliminar" onClick={() => deleteCalendarItem(item)}>×</button>}
                      </div>
                    </article>
                  );
                }) : <p className="upcoming-empty">Todavía no hay próximos eventos. Agreguemos el primero ♡</p>}
              </div>
            </div>
          </aside>
        </div>

        <div className="dashboard-stats">
          <article><span className="stat-icon stat-icon--heart">♡</span><strong>{importantCount}</strong><p>Fechas importantes<small>Momentos que siempre queremos recordar</small></p></article>
          <article><span className="stat-icon stat-icon--task">✓</span><strong>{pendingTaskCount}</strong><p>Tareas pendientes<small>Planes que todavía tenemos por hacer</small></p></article>
          <article><span className="stat-icon stat-icon--plan">✦</span><strong>{planCount}</strong><p>Ideas y sueños<small>Cosas que queremos vivir juntos</small></p></article>
          <article className="dashboard-love-note"><span>♡</span><p>Que todos nuestros mañanas estén llenos de planes juntos.</p></article>
        </div>
        {calendarMessage && <p className={`calendar-message ${calendarReady ? "" : "calendar-message--setup"}`} role="status">{calendarMessage}</p>}
      </section>

      <section className="capsule-section" id="capsula">
        <div className="capsule-heading">
          <div>
            <p className="overline"><span /> MENSAJES PARA NUESTRO FUTURO</p>
            <h2>Cápsula del tiempo</h2>
            <p>Escribimos hoy palabras que solo podremos volver a leer cuando llegue el momento que elegimos.</p>
          </div>
          <button className="capsule-new" onClick={() => { setCapsuleMessage(""); setShowCapsuleForm(true); }} disabled={!capsuleReady}><span>＋</span>Crear nueva cápsula</button>
        </div>

        <div className="capsule-layout">
          <div className="capsule-main">
            {capsuleLoading ? (
              <div className="capsule-empty"><span>♡</span><h3>Buscando nuestros mensajes para el futuro…</h3></div>
            ) : capsules.length ? (
              <div className="capsule-grid">
                {capsules.map((capsule) => {
                  const days = daysUntilDate(capsule.open_date);
                  return (
                    <article className={`capsule-card ${capsule.can_open ? "capsule-card--open" : ""}`} key={capsule.id}>
                      <div className="capsule-card__visual"><span className="capsule-envelope">✉</span><small>{capsule.can_open ? "LISTA PARA ABRIR" : "SELLADA"}</small></div>
                      <div className="capsule-card__body">
                        <div className="capsule-card__meta"><span>De: {capsule.author}</span><button title="Eliminar cápsula" onClick={() => deleteTimeCapsule(capsule)}>×</button></div>
                        <h3>{capsule.title}</h3>
                        <p className="capsule-open-date">Se abre el <strong>{formatLongDate(capsule.open_date)}</strong></p>
                        {capsule.can_open ? (
                          <><p className="capsule-ready-copy">El momento llegó. Este mensaje ya puede volver a tus manos.</p><button className="capsule-open-button" onClick={() => openTimeCapsule(capsule)}>Abrir cápsula <span>♡</span></button></>
                        ) : (
                          <><div className="capsule-countdown"><strong>{days}</strong><span>{days === 1 ? "día" : "días"} para abrirla</span></div><button className="capsule-locked-button" type="button" disabled><span>⌾</span> Todavía está bloqueada</button></>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="capsule-empty"><span>✉</span><h3>Nuestra primera cápsula empieza aquí</h3><p>Escriban algo que quieran volver a sentir dentro de unos meses o unos años.</p><button onClick={() => setShowCapsuleForm(true)} disabled={!capsuleReady}>Crear la primera cápsula</button></div>
            )}
          </div>

          <aside className="capsule-how">
            <p className="capsule-how__quote">“Hay palabras que se disfrutan más cuando el tiempo las vuelve a encontrar.”</p>
            <h3>¿Cómo funciona?</h3>
            <ol>
              <li><span>1</span><div><strong>Escriban el mensaje</strong><p>Indica quién lo escribe, un título y todo lo que quieras decir.</p></div></li>
              <li><span>2</span><div><strong>Elijan la fecha</strong><p>La cápsula permanecerá cerrada hasta ese día.</p></div></li>
              <li><span>3</span><div><strong>Séllenla con la clave</strong><p>Para guardarla se necesita la misma contraseña privada del álbum.</p></div></li>
              <li><span>4</span><div><strong>Esperen el momento</strong><p>Cuando llegue la fecha aparecerá el botón para abrirla y leerla.</p></div></li>
            </ol>
            <div className="capsule-security"><span>⌾</span><p>Los mensajes bloqueados no se envían al navegador antes de su fecha de apertura.</p></div>
          </aside>
        </div>

        {capsuleMessage && <p className={`capsule-message ${capsuleReady ? "" : "capsule-message--setup"}`} role="status">{capsuleMessage}</p>}
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
              <label className={`file-drop ${previewUrl ? "file-drop--preview" : ""}`}>
                <input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handlePhotoChange} required />
                {previewUrl ? (
                  <>
                    <div className="file-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Vista previa de la foto seleccionada" />
                      <span className="file-preview__overlay">Cambiar foto</span>
                    </div>
                    <div className="file-preview__footer"><strong>Foto seleccionada ✓</strong><small>Haz clic para elegir otra</small></div>
                  </>
                ) : (
                  <><span className="file-drop__icon">＋</span><strong>Elige una foto</strong><small>JPG, PNG, WEBP o AVIF · máximo 4 MB</small></>
                )}
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
            ) : memories.length ? memories.map((memory) => (
              <article className="memory-card" key={memory.id}>
                <div className="memory-photo">
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

      {showCapsuleForm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowCapsuleForm(false)}>
          <section className="capsule-modal" role="dialog" aria-modal="true" aria-labelledby="capsule-form-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCapsuleForm(false)} aria-label="Cerrar formulario">×</button>
            <div className="capsule-modal__icon">✉</div>
            <p className="letter-kicker">PARA NUESTRO FUTURO</p>
            <h2 id="capsule-form-title">Crear nueva cápsula</h2>
            <p className="capsule-modal__intro">Escribe algo que quieras que uno de ustedes —o los dos— vuelva a encontrar en una fecha especial.</p>
            <form ref={capsuleFormRef} onSubmit={saveCapsule}>
              <label><span>¿Quién escribe este mensaje?</span><input name="author" maxLength={60} placeholder="Ej. David, Madeline o Los dos" required /></label>
              <label><span>Título de la cápsula</span><input name="title" maxLength={100} placeholder="Ej. Para nuestro primer aniversario" required /></label>
              <label><span>Mensaje</span><textarea name="message" maxLength={4000} rows={9} placeholder="Escribe aquí todo lo que quieres decirle a nuestro futuro…" required /></label>
              <div className="capsule-form-row">
                <label><span>Fecha en que se podrá abrir</span><input name="openDate" type="date" min={toDateKey(new Date())} required /></label>
                <label><span>Clave para sellarla</span><input name="uploadCode" type="password" autoComplete="off" placeholder="Clave de nuestro álbum" required /></label>
              </div>
              <p className="capsule-form-note"><span>⌾</span> Una vez guardado, el mensaje permanecerá oculto hasta la fecha elegida.</p>
              <button className="capsule-save-button" type="submit" disabled={capsuleSaving || !capsuleReady}>{capsuleSaving ? "Sellando cápsula…" : "Guardar y sellar cápsula"}<span>♡</span></button>
            </form>
          </section>
        </div>
      )}

      {openedCapsule && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setOpenedCapsule(null)}>
          <section className="capsule-letter-modal" role="dialog" aria-modal="true" aria-labelledby="opened-capsule-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setOpenedCapsule(null)} aria-label="Cerrar cápsula">×</button>
            <div className="capsule-letter-modal__heart">♡</div>
            <p className="letter-kicker">CÁPSULA ABIERTA</p>
            <h2 id="opened-capsule-title">{openedCapsule.title}</h2>
            <div className="capsule-letter-meta"><span>Escrita por <strong>{openedCapsule.author}</strong></span><span>Sellada el {new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(openedCapsule.created_at))}</span><span>Fecha de apertura: {formatLongDate(openedCapsule.open_date)}</span></div>
            <div className="capsule-letter-message">{openedCapsule.message?.split("\n").map((line, index) => <p key={index}>{line || <>&nbsp;</>}</p>)}</div>
            <p className="capsule-letter-signature">Un mensaje que esperó el momento correcto para volver a ustedes. ♡</p>
            <button className="capsule-close-button" onClick={() => setOpenedCapsule(null)}>Guardar este momento <span>♡</span></button>
          </section>
        </div>
      )}

      {showCalendarForm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowCalendarForm(false)}>
          <section className="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-form-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCalendarForm(false)} aria-label="Cerrar formulario">×</button>
            <p className="letter-kicker">NUESTRO TABLERO</p>
            <h2 id="calendar-form-title">Guardar una nueva fecha</h2>
            <p className="calendar-modal__intro">Puede ser una tarea, una cita especial, un plan para el futuro o una nota que no queremos olvidar.</p>
            <form ref={calendarFormRef} onSubmit={saveCalendarItem}>
              <label><span>¿Qué queremos guardar?</span><input name="title" maxLength={100} placeholder="Ej. Cena especial" required /></label>
              <div className="calendar-form-row">
                <label><span>Fecha</span><input name="eventDate" type="date" defaultValue={selectedCalendarDate} required /></label>
                <label><span>Hora (opcional)</span><input name="eventTime" type="time" /></label>
              </div>
              <label><span>Tipo</span><select name="kind" defaultValue="event"><option value="event">Acontecimiento / fecha importante</option><option value="task">Tarea</option><option value="plan">Idea o plan</option><option value="note">Nota</option></select></label>
              <label><span>Detalles</span><textarea name="details" maxLength={500} rows={4} placeholder="Agrega algún detalle especial…" /></label>
              <label><span>Clave de nuestro álbum</span><input name="uploadCode" type="password" autoComplete="off" placeholder="La misma clave que usamos para las fotos" required /></label>
              <button className="calendar-save-button" type="submit" disabled={calendarSaving}>{calendarSaving ? "Guardando…" : "Guardar en nuestro tablero"}<span>♡</span></button>
            </form>
          </section>
        </div>
      )}

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
