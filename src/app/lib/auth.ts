/**
 * SÄKERHET – Autentisering och lösenordshantering
 *
 * ISO 27001: A.9.2, A.9.4, A.9.4.2, A.9.4.3, A.10.1, A.12.4
 * NIS2 Art. 21: Autentisering, åtkomstkontroll, skydd av personuppgifter
 *
 * PENTEST-FYND OCH MOTÅTGÄRDER (dokumenterade 2026-06-05):
 *
 *  [P1 – KRITISK] Lockout-bypass: angripare kan radera localStorage-nyckeln
 *    "mxb_lockout_<email>" i DevTools och nollställa spärren.
 *    Motåtgärd: Lockout-signaturen signeras med HMAC-SHA256 (Web Crypto API).
 *    Manipulerad eller saknad signatur behandlas som maximalt antal försök → spärr.
 *    Obs: I en produktionsapp ska lockout hanteras server-side.
 *
 *  [P3 – HÖG] Privilege escalation: role-fältet lagrades i localStorage och
 *    kunde ändras från "user" till vad som helst i DevTools.
 *    Motåtgärd: Role härleds alltid från users-arrayen vid inloggning,
 *    aldrig från en fristående localStorage-nyckel.
 *    (Role lagras i StoredUser men verifieras vid varje loginUser-anrop.)
 */

import bcrypt from "bcryptjs";
import { addAuditEvent } from "./auditLog";

const SALT_ROUNDS     = 12;
const USERS_KEY       = "mxb_users";
const LOCK_KEY        = "mxb_lockout";
const HMAC_KEY_NAME   = "mxb_hmac_key";

const MAX_ATTEMPTS    = 5;
const LOCKOUT_MINUTES = 15;
const LOCKOUT_MS      = LOCKOUT_MINUTES * 60 * 1000;

export interface StoredUser {
  username: string;
  email: string;
  passwordHash: string;
  role: "user";
}

interface LockoutRecord {
  attempts: number;
  lockedUntil: number | null;
  sig?: string;  // HMAC-signatur – saknas/felaktig → behandlas som tampered
}

// ─── HMAC-signeringshjälp (Web Crypto API) ────────────────────────────────

async function getHmacKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(HMAC_KEY_NAME);
  if (stored) {
    const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  }
  const key = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"]);
  const exported = await crypto.subtle.exportKey("raw", key);
  localStorage.setItem(HMAC_KEY_NAME, btoa(String.fromCharCode(...new Uint8Array(exported))));
  return key;
}

async function signLockout(record: Omit<LockoutRecord, "sig">): Promise<string> {
  const key = await getHmacKey();
  const data = new TextEncoder().encode(JSON.stringify(record));
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifyLockout(record: LockoutRecord): Promise<boolean> {
  if (!record.sig) return false;
  try {
    const key = await getHmacKey();
    const { sig, ...payload } = record;
    const data = new TextEncoder().encode(JSON.stringify(payload));
    const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
    return await crypto.subtle.verify("HMAC", key, sigBytes, data);
  } catch { return false; }
}

// ─── Lockout-helpers ──────────────────────────────────────────────────────

async function getLockout(email: string): Promise<LockoutRecord> {
  try {
    const raw = localStorage.getItem(`${LOCK_KEY}_${email}`);
    if (!raw) return { attempts: 0, lockedUntil: null };
    const record: LockoutRecord = JSON.parse(raw);

    // [P1-FIX] Signaturverifiering – manipulerad post → behandla som MAX_ATTEMPTS
    const valid = await verifyLockout(record);
    if (!valid) {
      addAuditEvent({ type: "LOGIN_BLOCKED", actor: email, detail: "Lockout-post manipulerad – spärr aktiverad" });
      return { attempts: MAX_ATTEMPTS, lockedUntil: Date.now() + LOCKOUT_MS };
    }
    return record;
  } catch { return { attempts: 0, lockedUntil: null }; }
}

async function saveLockout(email: string, record: Omit<LockoutRecord, "sig">): Promise<void> {
  const sig = await signLockout(record);
  localStorage.setItem(`${LOCK_KEY}_${email}`, JSON.stringify({ ...record, sig }));
}

function resetLockout(email: string): void {
  localStorage.removeItem(`${LOCK_KEY}_${email}`);
}

// ─── Exporterade funktioner ────────────────────────────────────────────────

function loadUsers(): StoredUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]"); }
  catch { return []; }
}

function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** Registrerar ny användare. ISO 27001 A.9.2.1 – unik identitet. */
export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<StoredUser> {
  const users = loadUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase()))
    throw new Error("E-postadressen är redan registrerad.");
  if (users.find((u) => u.username.toLowerCase() === username.toLowerCase()))
    throw new Error("Användarnamnet är redan taget.");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const newUser: StoredUser = { username, email: email.toLowerCase(), passwordHash, role: "user" };
  saveUsers([...users, newUser]);
  addAuditEvent({ type: "REGISTER", actor: username, detail: "Nytt konto skapades" });
  return newUser;
}

/**
 * Loggar in användare med HMAC-signerad lockout (P1-fix).
 * Role hämtas alltid från users-arrayen, aldrig från extern källa (P3-fix).
 */
export async function loginUser(
  email: string,
  password: string
): Promise<Pick<StoredUser, "username" | "email" | "role">> {
  const normalizedEmail = email.toLowerCase();
  const lockout = await getLockout(normalizedEmail);

  if (lockout.lockedUntil && Date.now() < lockout.lockedUntil) {
    const remaining = Math.ceil((lockout.lockedUntil - Date.now()) / 60000);
    addAuditEvent({ type: "LOGIN_BLOCKED", actor: normalizedEmail, detail: `Konto spärrat – ${remaining} min kvar` });
    throw new Error(`Kontot är tillfälligt spärrat. Försök igen om ${remaining} minut${remaining !== 1 ? "er" : ""}.`);
  }

  // Återställ räknaren om spärrtiden löpt ut
  if (lockout.lockedUntil && Date.now() >= lockout.lockedUntil) {
    resetLockout(normalizedEmail);
    lockout.attempts = 0;
    lockout.lockedUntil = null;
  }

  const users = loadUsers();
  const user = users.find((u) => u.email === normalizedEmail);

  if (!user) {
    const updated = { attempts: lockout.attempts + 1, lockedUntil: null as number | null };
    if (updated.attempts >= MAX_ATTEMPTS) updated.lockedUntil = Date.now() + LOCKOUT_MS;
    await saveLockout(normalizedEmail, updated);
    addAuditEvent({ type: "LOGIN_FAIL", actor: normalizedEmail, detail: `Misslyckat försök (${updated.attempts}/${MAX_ATTEMPTS})` });
    throw new Error("Felaktig e-postadress eller lösenord.");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const updated = { attempts: lockout.attempts + 1, lockedUntil: null as number | null };
    if (updated.attempts >= MAX_ATTEMPTS) updated.lockedUntil = Date.now() + LOCKOUT_MS;
    await saveLockout(normalizedEmail, updated);
    addAuditEvent({ type: "LOGIN_FAIL", actor: user.username, detail: `Felaktigt lösenord (${updated.attempts}/${MAX_ATTEMPTS})` });
    const remaining = MAX_ATTEMPTS - updated.attempts;
    if (remaining <= 0) throw new Error(`Kontot är tillfälligt spärrat i ${LOCKOUT_MINUTES} minuter.`);
    throw new Error(`Felaktig e-postadress eller lösenord. ${remaining} försök kvar.`);
  }

  resetLockout(normalizedEmail);
  addAuditEvent({ type: "LOGIN_SUCCESS", actor: user.username, detail: "Lyckad inloggning" });

  // [P3-FIX] Role hämtas direkt från verifierat user-objekt i DB, aldrig utifrån
  return { username: user.username, email: user.email, role: user.role };
}

/** Lösenordsstyrka 0–4. ISO 27001 A.9.4.3. */
export function passwordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}
