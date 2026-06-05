/**
 * SÄKERHET – Sessionshantering och automatisk utloggning
 *
 * ISO 27001-kontroller:
 *  A.9.4  – Åtkomstkontroll till system och applikationer
 *  A.9.4.2 – Säkra inloggningsförfaranden (sessionstimeout)
 *
 * NIS2 (Art. 21):
 *  – Åtgärder för att säkerställa kontinuerlig sessionsövervakning
 *  – Minimera exponeringsfönstret vid obevakad session
 *
 * Kontroll: sessionen löper ut efter TIMEOUT_MS ms av inaktivitet.
 * Aktivitet definieras som: musrörelse, knapptryckning, scrollning.
 */

const TIMEOUT_MS   = 30 * 60 * 1000; // 30 minuter (ISO 27001 A.9.4.2)
const SESSION_KEY  = "mxb_session_active_until";

export function touchSession(): void {
  localStorage.setItem(SESSION_KEY, String(Date.now() + TIMEOUT_MS));
}

export function isSessionAlive(): boolean {
  const val = localStorage.getItem(SESSION_KEY);
  if (!val) return false;
  return Date.now() < Number(val);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Registrerar aktivitetslyssnare och kör en callback vid timeout.
 * Returnerar en cleanup-funktion för useEffect.
 */
export function startSessionWatcher(onTimeout: () => void): () => void {
  touchSession();

  const handleActivity = () => touchSession();
  const events = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"];
  events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));

  // Kolla varje minut om sessionen löpt ut
  const interval = setInterval(() => {
    if (!isSessionAlive()) {
      onTimeout();
    }
  }, 60_000);

  return () => {
    events.forEach((e) => window.removeEventListener(e, handleActivity));
    clearInterval(interval);
  };
}
