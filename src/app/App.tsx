/**
 * SÄKERHET – Huvudkomponent
 *
 * ISO 27001-kontroller:
 *  A.9.4  – Sessionstimeout via startSessionWatcher (30 min inaktivitet)
 *  A.12.4 – Alla CRUD-åtgärder loggas i audit trail (addAuditEvent)
 *
 * NIS2 Art. 21:
 *  – Spårbarhet: varje create/edit/delete loggas med aktör och tidsstämpel
 *  – Sessionskontroll: automatisk utloggning vid inaktivitet
 */

import { useState, useEffect } from "react";
import { Sun, Moon, LogOut, MessageSquare, Shield, AlertTriangle } from "lucide-react";
import { AuthModal } from "./components/AuthModal";
import { MessageCard, type Message } from "./components/MessageCard";
import { PostForm } from "./components/PostForm";
import { AuditLogPanel } from "./components/AuditLogPanel";
import { PentestReport } from "./components/PentestReport";
import { addAuditEvent, checkAuditIntegrity } from "./lib/auditLog";
import { startSessionWatcher, clearSession } from "./lib/session";

// [P4-FIX] Kontrollera audit-loggens integritet direkt vid appstart
checkAuditIntegrity();

// [P2-FIX] Seed-inlägg markeras med seeded:true.
// Utan flaggan: registrera som "celestine" → isOwner=true → radera/redigera.
// Med flaggan: isOwner returnerar alltid false för seeded-inlägg.
const SEED_MESSAGES: Message[] = [
  {
    id: "1", seeded: true,
    text: "Just launched something big. Can't say what yet, but the world won't be the same. 👀",
    username: "celestine",
    createdAt: new Date(Date.now() - 1000 * 60 * 3),
    likes: ["dex_bremr", "arlo.v"],
    comments: [{ id: "c1", username: "arlo.v", text: "Nu är jag nyfiken! 👀", createdAt: new Date(Date.now() - 1000 * 60 * 2) }],
  },
  {
    id: "2", seeded: true,
    text: "Morning run done. 6km before coffee. The discipline is the point.",
    username: "dex_bremr",
    createdAt: new Date(Date.now() - 1000 * 60 * 18),
    likes: ["matilda_"],
    comments: [],
  },
  {
    id: "3", seeded: true,
    text: "Hot take: silence is underrated. Most meetings could be a well-written doc.",
    username: "matilda_",
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
    likes: ["celestine", "dex_bremr", "noor_writes"],
    comments: [{ id: "c2", username: "noor_writes", text: "Håller med 100%. Asynckommunikation > alla möten.", createdAt: new Date(Date.now() - 1000 * 60 * 40) }],
  },
  {
    id: "4", seeded: true,
    text: "Redesigned my workspace today. Clean desk, clean mind — actually works.",
    username: "arlo.v",
    createdAt: new Date(Date.now() - 1000 * 60 * 90),
    likes: [],
    comments: [],
  },
  {
    id: "5", seeded: true,
    text: "Anyone else think the best ideas come in the shower? I've started keeping a waterproof notepad. No regrets.",
    username: "noor_writes",
    createdAt: new Date(Date.now() - 1000 * 60 * 130),
    likes: ["arlo.v"],
    comments: [],
  },
];

export default function App() {
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showPentest, setShowPentest] = useState(false);
  const [messages, setMessages] = useState<Message[]>(SEED_MESSAGES);
  const [sessionAlert, setSessionAlert] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // ISO 27001 A.9.4 – starta sessionstimer när användaren loggar in
  useEffect(() => {
    if (!user) return;
    const cleanup = startSessionWatcher(() => {
      // Sessionstimeout: logga ut och meddela användaren
      addAuditEvent({ type: "SESSION_TIMEOUT", actor: user, detail: "Sessionen löpte ut efter 30 min inaktivitet" });
      setUser(null);
      clearSession();
      setSessionAlert(true);
    });
    return cleanup;
  }, [user]);

  const handleAuth = (username: string) => {
    setUser(username);
    setSessionAlert(false);
  };

  const handleLogout = () => {
    if (user) {
      // ISO 27001 A.12.4 – logga utloggning
      addAuditEvent({ type: "LOGOUT", actor: user, detail: "Manuell utloggning" });
    }
    clearSession();
    setUser(null);
  };

  const handlePost = (text: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      text,
      username: user!,
      createdAt: new Date(),
      likes: [],
      comments: [],
    };
    setMessages((prev) => [msg, ...prev]);
    // ISO 27001 A.12.4 – logga skapande av inlägg
    addAuditEvent({ type: "MSG_CREATE", actor: user!, detail: `Inlägg skapat (${text.length} tecken)` });
  };

  const handleDelete = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    addAuditEvent({ type: "MSG_DELETE", actor: user!, detail: `Inlägg ${id.slice(0, 8)} raderades` });
  };

  const handleEdit = (id: string, text: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, text } : m));
    addAuditEvent({ type: "MSG_EDIT", actor: user!, detail: `Inlägg ${id.slice(0, 8)} redigerades` });
  };

  const handleLike = (id: string) => {
    if (!user) return;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const liked = m.likes.includes(user);
        return { ...m, likes: liked ? m.likes.filter((u) => u !== user) : [...m.likes, user] };
      })
    );
  };

  const handleComment = (id: string, text: string) => {
    if (!user) return;
    const comment = { id: crypto.randomUUID(), username: user, text, createdAt: new Date() };
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, comments: [...m.comments, comment] } : m));
    addAuditEvent({ type: "COMMENT_CREATE", actor: user, detail: `Kommentar på inlägg ${id.slice(0, 8)}` });
  };

  return (
    <div className="size-full min-h-screen bg-background text-foreground flex justify-center">

      {/* Vänster sidebar */}
      <aside className="hidden lg:flex flex-col items-end pr-6 pt-4 w-72 shrink-0">
        <div className="sticky top-4 flex flex-col gap-1 items-end">
          <div className="flex items-center gap-2 mb-6 select-none">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <MessageSquare size={14} className="text-white" />
            </div>
            <span className="text-sm text-muted-foreground tracking-widest uppercase">MXB</span>
          </div>

          <nav className="flex flex-col gap-1 items-end w-full">
            <button
              onClick={() => { setShowAudit(false); setShowPentest(false); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors w-fit ${!showAudit && !showPentest ? "text-foreground bg-muted/60" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}
            >
              <MessageSquare size={18} />
              <span className="text-sm">Feed</span>
            </button>

            {user && (
              <button
                onClick={() => { setShowAudit(true); setShowPentest(false); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors w-fit ${showAudit && !showPentest ? "text-foreground bg-muted/60" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}
              >
                <Shield size={18} />
                <span className="text-sm">Säkerhetslogg</span>
              </button>
            )}
            <button
              onClick={() => { setShowPentest(true); setShowAudit(false); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors w-fit ${showPentest ? "text-foreground bg-muted/60" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}
            >
              <AlertTriangle size={18} />
              <span className="text-sm">Pentest</span>
            </button>
          </nav>

          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 mt-6 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors w-fit"
            >
              <LogOut size={16} />
              <span className="text-sm">Logga ut</span>
            </button>
          )}
        </div>
      </aside>

      {/* Huvudinnehåll */}
      <main className="flex flex-col w-full max-w-xl border-x border-border min-h-screen">

        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur border-b border-border">
          <div>
            <h1 className="text-foreground tracking-tight" style={{ fontSize: "0.9rem", letterSpacing: "-0.01em" }}>
              MATILDA X BREMR
            </h1>
            <p className="text-xs text-muted-foreground" style={{ fontSize: "0.7rem" }}>public feed</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobilknapp för säkerhetslogg */}
            {user && (
              <button
                onClick={() => setShowAudit((v) => !v)}
                className={`lg:hidden p-2 rounded-xl transition-colors ${showAudit ? "text-blue-500 bg-blue-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                aria-label="Säkerhetslogg"
              >
                <Shield size={16} />
              </button>
            )}

            <button
              onClick={() => setDark((d) => !d)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Växla tema"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600/15 flex items-center justify-center">
                  <span className="text-xs text-blue-600" style={{ fontWeight: 600 }}>
                    {user.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  aria-label="Logga ut"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
              >
                Logga in
              </button>
            )}
          </div>
        </header>

        {/* Session-timeout-varning */}
        {sessionAlert && (
          <div className="mx-4 mt-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <Shield size={15} className="text-amber-500 shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400 flex-1">
              Du loggades ut automatiskt efter 30 minuters inaktivitet. (ISO 27001 A.9.4.2)
            </p>
            <button onClick={() => setSessionAlert(false)} className="text-muted-foreground hover:text-foreground">
              <span className="text-xs">×</span>
            </button>
          </div>
        )}

        {/* Visa antingen feed eller audit-logg */}
        {showPentest ? (
          <div className="flex-1 overflow-hidden">
            <PentestReport />
          </div>
        ) : showAudit && user ? (
          <div className="flex-1">
            <AuditLogPanel />
          </div>
        ) : (
          <>
            {user && <PostForm username={user} onPost={handlePost} />}

            <section>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                  <MessageSquare size={36} className="mb-3 opacity-30" />
                  <p className="text-sm">Inga inlägg än. Var den första.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageCard
                    key={msg.id}
                    message={msg}
                    currentUser={user}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onLike={handleLike}
                    onComment={handleComment}
                  />
                ))
              )}
            </section>

            {!user && (
              <div className="mx-4 my-6 px-5 py-5 rounded-2xl border border-border bg-muted/20">
                <p className="text-sm text-foreground mb-1" style={{ fontWeight: 600 }}>Gå med i konversationen</p>
                <p className="text-xs text-muted-foreground mb-4">Logga in eller skapa ett konto för att posta, gilla och kommentera.</p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
                >
                  Kom igång
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Höger spacer */}
      <aside className="hidden lg:block w-72 shrink-0" />

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onAuth={handleAuth}
      />
    </div>
  );
}
