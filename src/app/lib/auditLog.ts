/**
 * SÄKERHET – Audit trail (aktivitetslogg)
 *
 * ISO 27001-kontroller:
 *  A.12.4.1 – Händelseloggning: logg förs för alla säkerhetskritiska händelser
 *  A.12.4.2 – Skydd av logginformation (loggen skrivs append-only)
 *  A.12.4.3 – Administratörs- och operatörsloggar
 *
 * NIS2 (Art. 21.2 e):
 *  – Spårbarhet av åtgärder och tillbud (Repudiation-skydd ur STRIDE)
 *  – Incidenthantering kräver att händelsedata finns tillgänglig
 *
 * Lagringsnotering: loggen sparas i localStorage i denna demo.
 * I produktion ska loggar skickas till en tamper-evident loggserver.
 */

const LOG_KEY     = "mxb_audit_log";
const MAX_ENTRIES = 200; // Begränsa loggstorlek (skyddar mot DoS i localStorage)

export type AuditEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAIL"
  | "LOGIN_BLOCKED"
  | "LOGOUT"
  | "REGISTER"
  | "SESSION_TIMEOUT"
  | "MSG_CREATE"
  | "MSG_EDIT"
  | "MSG_DELETE"
  | "COMMENT_CREATE";

export interface AuditEvent {
  id: string;
  timestamp: string; // ISO 8601
  type: AuditEventType;
  actor: string;     // användarnamn eller e-post
  detail: string;
}

export function addAuditEvent(
  event: Omit<AuditEvent, "id" | "timestamp">
): void {
  const log = loadAuditLog();
  const entry: AuditEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...event,
  };
  // Append-only, senaste händelsen först, max MAX_ENTRIES
  const updated = [entry, ...log].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
  } catch {
    // localStorage fullt – tyst fallback (undviker att krascha appen)
  }
}

export function loadAuditLog(): AuditEvent[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]"); }
  catch { return []; }
}

/**
 * [P4-FIX] Audit log tampering-detektering.
 * Loggen kan inte skyddas mot radering i en ren frontend-app – det kräver
 * server-side lagring. Motåtgärd: varje sessionstart jämför loggens längd.
 * En plötsligt kortare logg loggas som TAMPERING-händelse.
 */
const LOG_LENGTH_KEY = "mxb_audit_length";

export function checkAuditIntegrity(): void {
  const stored = parseInt(localStorage.getItem(LOG_LENGTH_KEY) ?? "0", 10);
  const current = loadAuditLog().length;
  if (stored > 0 && current < stored) {
    // Loggen har krympt sedan senaste kontrollen – möjlig tampering
    addAuditEvent({
      type: "LOGIN_BLOCKED", // återanvänder som generisk security-event
      actor: "SYSTEM",
      detail: `⚠️ Audit-logg minskade från ${stored} till ${current} poster – möjlig manipulering`,
    });
  }
  localStorage.setItem(LOG_LENGTH_KEY, String(loadAuditLog().length));
}

export function clearAuditLog(): void {
  localStorage.removeItem(LOG_KEY);
  localStorage.removeItem(LOG_LENGTH_KEY);
}
