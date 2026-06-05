/**
 * SÄKERHET – Audit trail-panel
 *
 * ISO 27001 A.12.4.1 – Händelseloggning (synlig för inloggad användare).
 * NIS2 Art. 21 – Spårbarhet av säkerhetshändelser.
 *
 * Panelen visar de senaste loggposterna med tidsstämpel, typ och aktör.
 * I en produktionsmiljö skulle denna vy vara begränsad till administratörer.
 */

import { useState, useEffect } from "react";
import { Shield, Clock, LogIn, LogOut, AlertTriangle, MessageSquare, Edit, Trash2, UserPlus, Ban } from "lucide-react";
import { loadAuditLog, type AuditEvent, type AuditEventType } from "../lib/auditLog";

const EVENT_META: Record<AuditEventType, { label: string; icon: React.ReactNode; color: string }> = {
  LOGIN_SUCCESS:   { label: "Inloggad",         icon: <LogIn size={13} />,        color: "text-green-500" },
  LOGIN_FAIL:      { label: "Inloggning nekad",  icon: <AlertTriangle size={13} />, color: "text-amber-500" },
  LOGIN_BLOCKED:   { label: "Konto spärrat",     icon: <Ban size={13} />,          color: "text-red-500" },
  LOGOUT:          { label: "Utloggad",          icon: <LogOut size={13} />,       color: "text-muted-foreground" },
  REGISTER:        { label: "Konto skapat",      icon: <UserPlus size={13} />,     color: "text-blue-500" },
  SESSION_TIMEOUT: { label: "Session löpte ut",  icon: <Clock size={13} />,        color: "text-amber-500" },
  MSG_CREATE:      { label: "Inlägg skapat",     icon: <MessageSquare size={13} />, color: "text-blue-400" },
  MSG_EDIT:        { label: "Inlägg redigerat",  icon: <Edit size={13} />,         color: "text-blue-400" },
  MSG_DELETE:      { label: "Inlägg raderat",    icon: <Trash2 size={13} />,       color: "text-red-400" },
  COMMENT_CREATE:  { label: "Kommentar skapad",  icon: <MessageSquare size={13} />, color: "text-purple-400" },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE");
}

export function AuditLogPanel() {
  // Buggfix: useMemo med tom dep-array läste bara in loggen vid mount.
  // Polling var 2 s håller panelen uppdaterad när nya händelser skrivs.
  const [events, setEvents] = useState<AuditEvent[]>([]);
  useEffect(() => {
    setEvents(loadAuditLog());
    const id = setInterval(() => setEvents(loadAuditLog()), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Shield size={15} className="text-blue-500" />
        <span className="text-sm text-foreground" style={{ fontWeight: 600 }}>Säkerhetslogg</span>
        <span className="ml-auto text-xs text-muted-foreground">ISO 27001 A.12.4 · NIS2 Art.21</span>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
          <Shield size={28} className="mb-2 opacity-30" />
          <p className="text-xs">Inga händelser loggade ännu</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {(() => {
            let lastDate = "";
            return events.map((ev) => {
              const date = formatDate(ev.timestamp);
              const showDate = date !== lastDate;
              lastDate = date;
              const meta = EVENT_META[ev.type] ?? { label: ev.type, icon: <Shield size={13} />, color: "text-muted-foreground" };
              return (
                <div key={ev.id}>
                  {showDate && (
                    <div className="px-4 py-1.5 bg-muted/30 border-b border-border">
                      <span className="text-xs text-muted-foreground">{date}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-3 px-4 py-2.5 border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <span className={`mt-0.5 shrink-0 ${meta.color}`}>{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${meta.color}`} style={{ fontWeight: 600 }}>{meta.label}</span>
                        <span className="text-xs text-muted-foreground truncate">@{ev.actor}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.detail}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatTime(ev.timestamp)}</span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      <div className="px-4 py-2 border-t border-border bg-muted/10">
        <p className="text-xs text-muted-foreground">
          Logg lagras lokalt · max 200 poster · append-only
        </p>
      </div>
    </div>
  );
}
