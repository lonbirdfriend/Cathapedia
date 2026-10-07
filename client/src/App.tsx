import { useEffect, useMemo, useState, type ReactNode } from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useForm } from "react-hook-form";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BookOpen, Plus, Search, ArrowUpRight, ArrowRight, ChevronRight, ChevronLeft,
  X, ShieldCheck, Moon, Sun, Download, Upload, Pencil, Trash2, Layers, Menu,
  HelpCircle, Check, RotateCw, Shuffle, Leaf, Users, LogOut, AlertCircle, FileText,
} from "lucide-react";
import { apiRequest, queryClient, setAdminToken, apiUrl } from "./lib/queryClient";
import { Form } from "@/components/ui/form";
import type { Entry } from "@shared/schema";
import { categoryNames } from "@shared/categories";
import "./index.css";

function Logo() {
  return <svg viewBox="0 0 36 38" width="33" height="36" fill="none" aria-label="Cathapedia">
    <path d="M17.5 8C12 3 6 4 3 5v25c5-2 10-1 14.5 3C22 29 28 28 33 30V5c-4-1-10-1-15.5 3Z" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round"/>
    <path d="M18 9v23M8 12c2-.2 4 .4 6 1.5M8 18c2-.2 4 .4 6 1.5M23 14l2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function Modal({ title, description, children, close, wide = false }: { title: string; description: string; children: ReactNode; close: () => void; wide?: boolean }) {
  return <Dialog.Root open onOpenChange={open => !open && close()}><Dialog.Portal>
    <Dialog.Overlay className="overlay"/>
    <Dialog.Content className={`modal ${wide ? "wide" : ""}`}>
      <header className="modal-header"><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description></div>
        <Dialog.Close className="icon-button" aria-label="Schließen" data-testid="close-modal"><X size={20}/></Dialog.Close></header>
      {children}
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
type EditFields = { concept: string; definition: string; example: string; category: string; aliases: string; source: string; author: string };

function Editor({ entry, categories, done, close }: { entry?: Entry; categories: string[]; done: (message: string) => void; close: () => void }) {
  const form = useForm<EditFields>({ defaultValues: {
    concept: entry?.concept || "", definition: entry?.definition || "", example: entry?.example || "",
    category: entry?.categories.join("; ") || "Grundlagen", aliases: entry?.aliases.join("; ") || "",
    source: entry?.source || "", author: entry?.author || "",
  } });
  const [error, setError] = useState("");
  async function save(values: EditFields) {
    setError("");
    try {
      await apiRequest(entry ? "PUT" : "POST", entry ? `/api/entries/${entry.id}` : "/api/entries", {
        ...values, categories: values.category.split(";").map(s => s.trim()).filter(Boolean),
        aliases: values.aliases.split(";").map(s => s.trim()).filter(Boolean),
        author: values.author || "Lerngruppe", version: entry?.version,
      });
      done(entry ? "Änderungen gespeichert." : "Ein Begriff mehr. Danke fürs Mitdenken!");
    } catch (e) { setError((e as Error).message); }
  }
  return <Modal title={entry ? "Eintrag bearbeiten" : "Wissen, das weiterhilft."} description={entry ? "Ändere den Eintrag für eure gesamte Lerngruppe." : "Erkläre einen Begriff in deinen Worten. Die anderen werden's dir danken."} close={close} wide>
    <Form {...form}><form className="entry-form" onSubmit={form.handleSubmit(save)}>
      <label>Fachbegriff <span>*</span><input data-testid="input-concept" autoFocus placeholder="z. B. Propriozeption" maxLength={150} {...form.register("concept", { required: true })} required/></label>
      <label>Was bedeutet das? <span>*</span><textarea data-testid="input-definition" placeholder="Eine verständliche Erklärung, gerne kurz und klar." rows={5} maxLength={20000} {...form.register("definition", { required: true, minLength: 3 })} required minLength={3}/></label>
      <label>Ein Beispiel aus dem Alltag <small>optional</small><textarea data-testid="input-example" placeholder="So wird der Begriff greifbar …" rows={2} maxLength={5000} {...form.register("example")}/></label>
      <div className="form-grid"><label>Kategorie <span>*</span><input data-testid="input-category" list="categories" {...form.register("category", { required: true })} required/><datalist id="categories">{categories.map(c => <option key={c}>{c}</option>)}</datalist><small>Mehrere Kategorien mit ; trennen.</small></label>
        <label>Dein Name <small>optional</small><input data-testid="input-author" placeholder="z. B. Catha" maxLength={60} {...form.register("author")}/></label></div>
      <details className="extra-fields"><summary>Synonyme & Quelle ergänzen</summary><label>Synonyme / Abkürzungen<input data-testid="input-aliases" placeholder="Mit ; trennen" {...form.register("aliases")}/></label>
        <label>Quelle<input data-testid="input-source" placeholder="Buch, Unterrichtsunterlage oder https://…" maxLength={500} {...form.register("source")}/></label></details>
      <p className="fineprint">Keine Patientendaten eintragen. Lerninhalte bitte mit Unterricht und Fachliteratur abgleichen.</p>
      {error && <div role="alert" className="error"><AlertCircle size={17}/>{error}</div>}
      <footer className="modal-footer"><button type="button" className="button secondary" onClick={close}>Abbrechen</button><button className="button primary" data-testid="save-entry" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Wird gespeichert …" : entry ? "Änderungen speichern" : "Eintrag hinzufügen"}<ArrowRight size={17}/></button></footer>
    </form></Form>
  </Modal>;
}

function AdminLogin({ close, login }: { close: () => void; login: () => void }) {
  const form = useForm<{ password: string }>();
  const [error, setError] = useState("");
  return <Modal title="Hallo, Admin." description="Ein Passwort. Ein bisschen mehr Verantwortung." close={close}>
    <Form {...form}><form className="entry-form" onSubmit={form.handleSubmit(async ({ password }) => {
      setError("");
      try { const res = await apiRequest("POST", "/api/login", { password }); const data = await res.json(); setAdminToken(data.token); login(); }
      catch (e) { setError((e as Error).message); }
    })}>
      <p>Hier kannst du Einträge bearbeiten, löschen und eure Moodle-XML-Datei importieren.</p>
      <label>Adminpasswort<input type="password" data-testid="input-password" autoComplete="current-password" {...form.register("password", { required: true })} required autoFocus/></label>
      {error && <div className="error" role="alert">{error}</div>}
      <button className="button primary full-width" data-testid="admin-submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Einen Moment …" : "Adminbereich öffnen"}<ShieldCheck size={17}/></button>
      <small className="muted">Du bleibst für diese Sitzung angemeldet, maximal 8 Stunden.</small>
    </form></Form>
  </Modal>;
}

function Importer({ close, done }: { close: () => void; done: (message: string) => void }) {
  const [xml, setXml] = useState("");
  const [filename, setFilename] = useState("");
  const [preview, setPreview] = useState<{ total: number; duplicate: number; fresh: number; concepts: string[] } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function select(file?: File) {
    if (!file) return;
    setError(""); setPreview(null); setXml(""); setFilename(file.name);
    if (file.size > 3_000_000) { setError("Bitte eine XML-Datei mit höchstens 3 MB auswählen."); return; }
    setBusy(true);
    try { const text = await file.text(); const res = await apiRequest("POST", "/api/import/preview", { xml: text }); setPreview(await res.json()); setXml(text); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <Modal title="Euer Wissen zieht um." description="Importiere Glossareinträge direkt aus einer Moodle-XML-Datei." close={close}>
    <div className="entry-form">
      <label className="upload-area"><Upload size={30}/><strong>{filename || "Moodle-XML auswählen"}</strong><span>Begriffe, Erklärungen, Kategorien & Synonyme · max. 3 MB</span>
        <input type="file" accept=".xml,text/xml,application/xml" data-testid="input-xml" disabled={busy} onChange={e => select(e.target.files?.[0])}/></label>
      {busy && <p role="status">Die Datei wird geprüft …</p>}
      {preview && <div className="import-summary"><strong>{preview.fresh} neue Einträge bereit</strong><p>{preview.total} gefunden · {preview.duplicate} doppelte Begriffe werden übersprungen.</p><div className="preview-terms">{preview.concepts.slice(0, 8).map((s, i) => <span key={i}>{s}</span>)}</div></div>}
      <p className="fineprint">Bestehende Begriffe bleiben unverändert. Die gesamte Datei wird zuerst geprüft, danach gemeinsam gespeichert. Bilder und Dateianhänge werden nicht übernommen.</p>
      {error && <div role="alert" className="error">{error}</div>}
      <footer className="modal-footer"><button className="button secondary" onClick={close}>Abbrechen</button><button className="button primary" data-testid="confirm-import" disabled={busy || !preview?.fresh} onClick={async () => {
        setBusy(true); setError("");
        try { const response = await apiRequest("POST", "/api/import", { xml }); const r = await response.json(); done(`${r.imported} Einträge importiert. ${r.skipped} doppelte Begriffe übersprungen.`); }
        catch (e) { setError((e as Error).message); setBusy(false); }
      }}>Jetzt importieren<ArrowRight size={17}/></button></footer>
    </div>
  </Modal>;
}

function Study({ entries, close }: { entries: Entry[]; close: () => void }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const e = entries[index];
  return <Modal title="Eine kleine Lernrunde." description="Die aktuell gefilterten Einträge, einen Gedanken nach dem anderen." close={close}>
    {e ? <><div className="study-meta"><span>{index + 1} von {entries.length}</span><span>{e.categories[0]}</span></div><button className={`study-card ${flipped ? "flipped" : ""}`} data-testid="flip-card" onClick={() => setFlipped(!flipped)}><small>{flipped ? "DIE ERKLÄRUNG" : "WAS BEDEUTET …"}</small><strong>{flipped ? e.definition : e.concept}</strong><span><RotateCw size={15}/>{flipped ? "Zurück zum Begriff" : "Tippen, um aufzudecken"}</span></button>
      <footer className="modal-footer"><button className="button secondary" disabled={index === 0} onClick={() => { setIndex(index - 1); setFlipped(false); }}><ChevronLeft size={16}/>Zurück</button><button className="button primary" data-testid="next-card" onClick={() => { setIndex((index + 1) % entries.length); setFlipped(false); }}>{index === entries.length - 1 ? "Nochmal von vorn" : "Nächster Begriff"}<ArrowRight size={16}/></button></footer></> : <p>Keine Einträge ausgewählt. Hebe zuerst deine Filter auf.</p>}
  </Modal>;
}

function EntryCard({ entry, admin, edit, remove, expanded, expand }: { entry: Entry; admin: boolean; edit: () => void; remove: () => void; expanded: boolean; expand: () => void }) {
  return <article className="entry-card" data-testid={`entry-${entry.id}`}>
    <div className="entry-top"><div className="entry-heading"><button className="term-button" onClick={expand} aria-expanded={expanded} data-testid={`expand-${entry.id}`}><h2>{entry.concept}</h2></button><span className="category-badge">{entry.categories[0]}</span></div>
      <button className="icon-button expand-button" onClick={expand} aria-label={`${entry.concept}: ${expanded ? "weniger" : "mehr"} anzeigen`}><ChevronRight size={19} className={expanded ? "turned" : ""}/></button></div>
    <p className="definition">{entry.definition}</p>
    {entry.example && <div className="example"><span>ALLTAGSBEISPIEL</span><p>{entry.example}</p></div>}
    {expanded && <div className="entry-details">
      {entry.aliases.length > 0 && <p><strong>Auch bekannt als:</strong> {entry.aliases.join(", ")}</p>}
      {entry.categories.length > 1 && <p><strong>Kategorien:</strong> {entry.categories.join(", ")}</p>}
      <p><strong>Quelle:</strong> {entry.source ? /^https?:\/\//i.test(entry.source) ? <a href={entry.source} target="_blank" rel="noopener noreferrer">{entry.source}<ArrowUpRight size={13}/></a> : entry.source : "Noch nicht ergänzt."}</p>
      <p><strong>Zuletzt bearbeitet:</strong> {new Date(entry.updatedAt).toLocaleDateString("de-DE")}</p>
    </div>}
    <footer className="entry-footer"><span><span className="mini-avatar">{entry.author[0]?.toUpperCase() || "L"}</span>Von {entry.author}</span><div>{admin && <><button className="text-button" data-testid={`edit-${entry.id}`} onClick={edit}><Pencil size={14}/>Bearbeiten</button><button className="icon-button danger" data-testid={`delete-${entry.id}`} onClick={remove} aria-label={`${entry.concept} löschen`}><Trash2 size={15}/></button></>}<button className="text-button more-button" onClick={expand}>{expanded ? "Weniger" : "Mehr zum Begriff"}<ArrowUpRight size={15}/></button></div></footer>
  </article>;
}

function Glossary() {
  const [location, navigate] = useLocation();
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState("");
  const [fulltext, setFulltext] = useState(true);
  const [category, setCategory] = useState("");
  const [letter, setLetter] = useState("");
  const [sort, setSort] = useState("alpha");
  const [pageNumber, setPageNumber] = useState(1);
  const [admin, setAdmin] = useState(false);
  const [modal, setModal] = useState<"new" | "login" | "import" | "help" | "study" | null>(null);
  const [editing, setEditing] = useState<Entry | undefined>();
  const [deleting, setDeleting] = useState<Entry | undefined>();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [randomIndex, setRandomIndex] = useState(0);
  const { data: all = [], isLoading, error, refetch, isFetching } = useQuery<Entry[]>({ queryKey: ["/api/entries"], refetchInterval: 20000, refetchOnWindowFocus: true });
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  useEffect(() => { setPageNumber(1); }, [search, category, letter, sort]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(""), 9000); return () => clearTimeout(id); }, [notice]);
  const categories = useMemo(() => Array.from(new Set([...categoryNames, ...all.flatMap(e => e.categories)])), [all]);
  const normalize = (s: string) => s.toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss");
  const filtered = useMemo(() => all.filter(e => {
    const haystack = [e.concept, ...e.aliases, ...(fulltext ? [e.definition, e.example] : [])].join(" ");
    return (!category || e.categories.includes(category)) && (!letter || normalize(e.concept).startsWith(letter.toLowerCase())) && normalize(haystack).includes(normalize(search));
  }).sort((a, b) => sort === "new" ? b.createdAt.localeCompare(a.createdAt) : a.concept.localeCompare(b.concept, "de")), [all, search, category, letter, sort, fulltext]);
  const maxPages = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(pageNumber, maxPages);
  const visible = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const random = all.length ? all[randomIndex % all.length] : undefined;
  const authors = new Set(all.map(e => e.author)).size;
  function reset() { setCategory(""); setLetter(""); setSearch(""); setSort("alpha"); navigate("/"); setMobile(false); }
  function done(message: string) { queryClient.invalidateQueries({ queryKey: ["/api/entries"] }); setModal(null); setEditing(undefined); setNotice(message); }
  function chooseCategory(c: string) { setCategory(c); setLetter(""); navigate("/"); setMobile(false); }
  const isCategories = location === "/kategorien";
  return <div className="app-shell">
    <a className="skip-link" href="#main" onClick={e => { e.preventDefault(); document.getElementById("main")?.focus(); }}>Zum Inhalt</a>
    {mobile && <button className="sidebar-scrim" aria-label="Menü schließen" onClick={() => setMobile(false)}/>}
    <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
      <button className="brand" onClick={reset} data-testid="brand-home"><Logo/><span>Cathapedia<small>WISSEN, DAS BLEIBT.</small></span></button>
      <div className="workspace-label"><span className="workspace-icon"><Leaf size={17}/></span><div>Ergotherapie<small>Unser gemeinsames Glossar</small></div></div>
      <nav aria-label="Hauptnavigation" className="main-nav">
        <button className={!isCategories ? "selected" : ""} onClick={reset} data-testid="nav-glossary"><BookOpen size={19}/>Das Glossar<span className="count">{all.length}</span></button>
        <button className={isCategories ? "selected" : ""} onClick={() => { navigate("/kategorien"); setMobile(false); }} data-testid="nav-categories"><Layers size={19}/>Kategorien<span className="count">{categories.filter(c => all.some(e => e.categories.includes(c))).length}</span></button>
        <button onClick={() => { setModal("study"); setMobile(false); }} data-testid="nav-study"><RotateCw size={19}/>Kleine Lernrunde<ArrowUpRight size={15} className="nav-arrow"/></button>
      </nav>
      <div className="sidebar-heading">THEMENGEBIETE</div>
      <nav className="category-nav" aria-label="Themengebiete">{categories.map((c, i) => <button key={c} className={category === c ? "active-category" : ""} onClick={() => chooseCategory(c)} data-testid={`category-${i}`}><span className={`category-dot dot-${i % 4}`}/><span>{c}</span><small>{all.filter(e => e.categories.includes(c)).length}</small></button>)}</nav>
      <div className="sidebar-bottom"><div className="little-note"><Users size={20}/><p>Ein bisschen von allen.<br/><strong>Ein bisschen einfacher lernen.</strong></p></div>
        <button className="sidebar-help" onClick={() => setModal("help")} data-testid="help"><HelpCircle size={17}/>So funktioniert's</button>
        <button className="sidebar-help admin-link" data-testid="admin-login" onClick={() => admin ? (setAdmin(false), setAdminToken(""), setNotice("Du bist jetzt abgemeldet.")) : setModal("login")}>{admin ? <LogOut size={17}/> : <ShieldCheck size={17}/>} {admin ? "Admin abmelden" : "Adminbereich"}<span>{admin ? "Aktiv" : "Nur für Catha & Co."}</span></button></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Menü öffnen" onClick={() => setMobile(true)}><Menu size={22}/></button><span>Unser Lernraum</span><ChevronRight size={14}/><strong>{isCategories ? "Kategorien" : "Das Glossar"}</strong></div><div className="header-actions"><span className="live-label"><span/>Gemeinsam schlauer.</span><button className="icon-button" data-testid="theme-toggle" aria-label={dark ? "Helles Design" : "Dunkles Design"} onClick={() => setDark(!dark)}>{dark ? <Sun size={19}/> : <Moon size={19}/>}</button><span className="user-avatar" title={admin ? "Admin angemeldet" : "Offener Lernraum"}>{admin ? <ShieldCheck size={19}/> : <Users size={19}/>}</span></div></header>
      <main id="main" tabIndex={-1}>
        <section className="page-heading"><div><div className="eyebrow">VON EUCH. FÜR EUCH.</div><h1>{isCategories ? "Ein Thema. Viele Aha-Momente." : "Fachbegriffe ohne Fachwort-Panik."}</h1><p>Das Ergotherapie-Glossar für Catha und ihre Lieblingsmitlernenden.</p></div><button className="button primary add-button" data-testid="add-entry" onClick={() => setModal("new")}><Plus size={18}/>Eintrag hinzufügen</button></section>
        <section className="welcome-band"><div><span className="welcome-icon"><BookOpen size={24}/></span><p><strong>Geteiltes Wissen ist doppeltes Wissen.</strong><span>Nachschlagen, verstehen, ergänzen. Ganz ohne Anmeldung.</span></p></div><span className="welcome-signature">Catha approved.<Check size={16}/></span></section>
        {notice && <div className="notice" role="status"><Check size={18}/><span>{notice}</span><button className="icon-button" onClick={() => setNotice("")} aria-label="Hinweis schließen"><X size={17}/></button></div>}
        {admin && <div className="admin-toolbar"><span><ShieldCheck size={17}/>Adminmodus</span><div><a className="text-button" href={apiUrl("/api/export")} download="cathapedia.xml" data-testid="export-xml"><Download size={16}/>XML exportieren</a><button className="text-button" onClick={() => setModal("import")} data-testid="import-open"><Upload size={16}/>XML importieren</button></div></div>}
        {error && <div className="error" role="alert"><AlertCircle size={18}/><span>{(error as Error).message}</span><button className="text-button" onClick={() => refetch()}>Erneut versuchen</button></div>}
        {isCategories ? <section className="categories-page"><div className="section-title"><h2>Eure Themengebiete</h2><span>{all.length} Begriffe, gut sortiert.</span></div>{categories.map((c, i) => <button className="category-row" key={c} onClick={() => chooseCategory(c)} data-testid={`category-card-${i}`}><span className={`category-dot dot-${i % 4}`}/><strong>{c}</strong><span>{all.filter(e => e.categories.includes(c)).length} Begriffe</span><ArrowUpRight size={19}/></button>)}</section> :
        <div className="content-grid"><section className="glossary-main" aria-label="Glossareinträge">
          <div className="search-row"><label className="search-input"><Search size={20}/><span className="sr-only">Glossar durchsuchen</span><input data-testid="search" value={search} placeholder="Welchen Begriff suchst du?" onChange={e => setSearch(e.target.value)}/>{search && <button className="icon-button" aria-label="Suche leeren" onClick={() => setSearch("")}><X size={17}/></button>}</label><label className="fulltext"><input type="checkbox" checked={fulltext} onChange={e => setFulltext(e.target.checked)} data-testid="fulltext"/>Volltextsuche</label></div>
          <div className="tabs-row"><div className="sort-tabs"><button className={sort === "alpha" ? "active" : ""} onClick={() => setSort("alpha")} data-testid="sort-alpha">Alle Einträge<span>{filtered.length}</span></button><button className={sort === "new" ? "active" : ""} onClick={() => setSort("new")} data-testid="sort-new">Zuletzt ergänzt</button></div><button className="icon-button" aria-label="Einträge aktualisieren" title="Einträge aktualisieren" onClick={() => refetch()} data-testid="refresh"><RotateCw size={16} className={isFetching ? "spinning" : ""}/></button></div>
          <nav className="alphabet" aria-label="Nach Anfangsbuchstabe filtern"><button className={!letter ? "active" : ""} onClick={() => setLetter("")} data-testid="letter-all">Alle</button>{"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => <button key={l} aria-pressed={letter === l} className={letter === l ? "active" : ""} onClick={() => setLetter(l)} data-testid={`letter-${l}`}>{l}</button>)}</nav>
          <div className="results-heading"><span>{category || (letter ? `Buchstabe ${letter}` : "Euer gesammeltes Wissen")}</span><small>{filtered.length} {filtered.length === 1 ? "Eintrag" : "Einträge"}</small>{(category || letter || search) && <button className="text-button" onClick={reset} data-testid="reset-filters">Filter aufheben<X size={13}/></button>}</div>
          {isLoading ? <div className="loading-list" aria-label="Glossar wird geladen">{[1, 2, 3].map(i => <div className="skeleton-card" key={i}><span/><span/><span/></div>)}</div> :
          visible.length ? <div className="entry-list">{visible.map(e => <EntryCard key={e.id} entry={e} admin={admin} expanded={expanded === e.id} expand={() => setExpanded(expanded === e.id ? null : e.id)} edit={() => setEditing(e)} remove={() => { setDeleting(e); setDeleteError(""); }}/>)}</div> :
          !error && <div className="empty-state"><BookOpen size={32}/><h2>{all.length ? "Hier ist noch Platz für Wissen." : "Das erste Wort gehört euch."}</h2><p>{all.length ? "Kein passender Begriff gefunden. Versuche es ohne Filter oder ergänze ihn selbst." : "Füge euren ersten Begriff hinzu oder importiere als Admin euer Moodle-Glossar."}</p><button className="button primary" onClick={() => setModal("new")}><Plus size={17}/>Begriff ergänzen</button></div>}
          {maxPages > 1 && <div className="pagination"><button className="button secondary" disabled={currentPage === 1} onClick={() => setPageNumber(currentPage - 1)}><ChevronLeft size={16}/>Zurück</button><span>Seite {currentPage} von {maxPages}</span><button className="button secondary" data-testid="next-page" disabled={currentPage === maxPages} onClick={() => setPageNumber(currentPage + 1)}>Weiter<ChevronRight size={16}/></button></div>}
        </section><aside className="right-rail">
          <section className="community-card"><div className="rail-label">UNSER WISSENSSCHATZ<Leaf size={17}/></div><div className="stat-line"><strong>{all.length}</strong><span>kleine Aha-Momente.<br/>Und es werden mehr.</span></div><div className="stat-bottom"><span><Layers size={14}/>{categories.filter(c => all.some(e => e.categories.includes(c))).length} Themengebiete</span><span><Users size={14}/>{authors} {authors === 1 ? "Name" : "Namen"}</span></div></section>
          {random && <section className="random-card"><div className="rail-label">SCHON GEWUSST?<button className="icon-button" data-testid="random-term" aria-label="Anderen Begriff entdecken" onClick={() => setRandomIndex(randomIndex + 1)}><Shuffle size={16}/></button></div><span className="random-category">{random.categories[0]}</span><h2>{random.concept}</h2><p>{random.definition.slice(0, 150)}{random.definition.length > 150 ? "…" : ""}</p><button className="text-button" data-testid="discover-term" onClick={() => { setCategory(""); setLetter(""); setSearch(random.concept); setExpanded(random.id); }}>Begriff entdecken<ArrowRight size={15}/></button></section>}
          <section className="contribute-card"><span className="rail-label">KLEINER LERNTIPP</span><h2>Selbst erklären.<br/>Besser verstehen.</h2><p>Ein Satz in deinen eigenen Worten hilft oft mehr als zehnmal lesen.</p><button className="text-button" onClick={() => setModal("new")}>Teile dein Wissen<Plus size={15}/></button></section>
          <p className="rail-footnote">Ein Lernraum, kein Lehrbuch.<br/>Bitte mit Unterricht & Fachliteratur abgleichen.</p>
        </aside></div>}
        <footer className="page-footer"><span>Cathapedia · Mit Wissen wächst man zusammen.</span><span>Keine Werbung. Kein Fachwort-Alleinsein.</span></footer>
      </main>
    </div>
    {(modal === "new" || editing) && <Editor key={editing?.id || "new"} entry={editing} categories={categories} done={done} close={() => { setModal(null); setEditing(undefined); }}/>}
    {modal === "login" && <AdminLogin close={() => setModal(null)} login={() => { setAdmin(true); setModal(null); setNotice("Adminmodus aktiv. Du kannst jetzt importieren, bearbeiten und löschen."); }}/>}
    {modal === "import" && <Importer close={() => setModal(null)} done={done}/>}
    {modal === "study" && <Study entries={filtered} close={() => setModal(null)}/>}
    {modal === "help" && <Modal title="Weniger Hürden. Mehr Aha." description="Euer gemeinsames Ergotherapie-Glossar, ganz unkompliziert." close={() => setModal(null)}><div className="help-content"><h3>Nachschlagen</h3><p>Suche nach einem Begriff, nutze das Alphabet oder stöbere in den Themengebieten. Die Volltextsuche findet auch Wörter in Erklärungen und Beispielen.</p><h3>Wissen ergänzen</h3><p>Alle dürfen Einträge erstellen, ohne Konto. Ein Name ist freiwillig. Bitte keine Patientendaten oder persönlichen Gesundheitsinformationen eintragen.</p><h3>Zusammen lernen</h3><p>Unter „Kleine Lernrunde“ werden die aktuell gefilterten Begriffe zu Lernkarten. Tippe auf eine Karte, um die Erklärung aufzudecken.</p><h3>Ordnung halten</h3><p>Nur mit Adminpasswort lassen sich bestehende Einträge bearbeiten und löschen oder Moodle-XML-Dateien importieren. Doppelte Begriffe werden beim Import übersprungen.</p><h3>Für eure Lerngruppe</h3><p>Der Link ist offen: Wer ihn hat, kann lesen und neue Einträge hinzufügen. Neue Beiträge anderer erscheinen spätestens nach etwa 20 Sekunden. Es gibt keine persönliche Lernstandsverfolgung.</p></div></Modal>}
    {deleting && <Modal title="Diesen Begriff wirklich löschen?" description={`„${deleting.concept}“ wird für alle aus dem Glossar entfernt.`} close={() => { if (!deleteBusy) setDeleting(undefined); }}><p>Das lässt sich nicht rückgängig machen. Exportiere bei Bedarf vorher ein XML-Backup.</p>{deleteError && <div role="alert" className="error">{deleteError}</div>}<footer className="modal-footer"><button className="button secondary" disabled={deleteBusy} onClick={() => setDeleting(undefined)}>Behalten</button><button className="button destructive" data-testid="confirm-delete" disabled={deleteBusy} onClick={async () => { setDeleteBusy(true); try { await apiRequest("DELETE", `/api/entries/${deleting.id}`); setDeleting(undefined); done("Eintrag gelöscht."); } catch (e) { setDeleteError((e as Error).message); } finally { setDeleteBusy(false); } }}>{deleteBusy ? "Wird gelöscht …" : "Ja, Eintrag löschen"}<Trash2 size={16}/></button></footer></Modal>}
  </div>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><Router hook={useHashLocation}><Glossary/></Router></QueryClientProvider>;
}
