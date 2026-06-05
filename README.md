# MATILDA X BREMR

En modern social meddelandeapplikation byggd med React, TypeScript och Tailwind CSS. Projektet är framtaget som en del av en kurs i webbsäkerhet och genomförs i tre faser: planering, kodförståelse och granskning.

---

## Innehållsförteckning

- [Projektbeskrivning](#projektbeskrivning)
- [Funktioner](#funktioner)
- [Teknikstack](#teknikstack)
- [Säkerhetsarkitektur](#säkerhetsarkitektur)
- [ISO 27001-mappning](#iso-27001-mappning)
- [NIS2-mappning](#nis2-mappning)
- [STRIDE-hotmodellering](#stride-hotmodellering)
- [Säkerhetskrav (fas 1)](#säkerhetskrav-fas-1)
- [Implementerade säkerhetskontroller (fas 2)](#implementerade-säkerhetskontroller-fas-2)
- [Filstruktur](#filstruktur)
- [Kom igång](#kom-igång)

---

## Projektbeskrivning

MATILDA X BREMR är en webbapplikation liknande Twitter/X där användare kan:

- Skapa ett konto och logga in
- Publicera meddelanden (max 140 tecken, min 3 tecken)
- Redigera och ta bort sina egna meddelanden
- Gilla inlägg (hjärtknapp) och kommentera
- Se en realtidslogg över säkerhetshändelser (audit trail)

Applikationen är designad med säkerhet som ledstjärna och implementerar kontroller enligt **ISO/IEC 27001:2022** och **NIS2-direktivet (2022/2555)**.

---

## Funktioner

| Funktion | Beskrivning |
|---|---|
| Registrering | Konto med användarnamn, e-post och lösenord |
| Inloggning | Autentisering med bcrypt-hashverifiering |
| Kontospärr | Automatisk spärr efter 5 misslyckade inloggningsförsök |
| Lösenordsstyrka | Live-indikator i 4 nivåer vid registrering |
| Sessionstimeout | Automatisk utloggning efter 30 min inaktivitet |
| Audit trail | Logg över alla säkerhetshändelser (inloggning, CRUD, timeout) |
| Meddelandefeed | Publicera, redigera, radera egna inlägg |
| Likes & kommentarer | Interaktion med andra användares inlägg |
| Mörkt/ljust läge | Systemanpassat tema med manuell toggle |
| Responsiv design | Fungerar på mobil och desktop |

---

## Teknikstack

| Komponent | Teknologi |
|---|---|
| Frontend-ramverk | React 18 + TypeScript |
| Styling | Tailwind CSS v4 |
| Lösenordshashning | bcryptjs (saltRounds=12) |
| UI-komponenter | Radix UI (Dialog, etc.) |
| Ikoner | lucide-react |
| Datum | date-fns |
| Byggverktyg | Vite 6 |
| Pakethanterare | pnpm |

---

## Säkerhetsarkitektur

```
src/app/
├── lib/
│   ├── auth.ts        # Registrering, inloggning, lösenordshashning, kontospärr
│   ├── auditLog.ts    # Audit trail – loggning av säkerhetshändelser
│   └── session.ts     # Sessionstimeout och aktivitetsspårning
├── components/
│   ├── AuthModal.tsx      # Inloggning/registrering med lösenordsstyrka
│   ├── MessageCard.tsx    # Inlägg med access control och XSS-skydd
│   ├── PostForm.tsx       # Formulär med input validation (3–140 tecken)
│   └── AuditLogPanel.tsx  # Visuell säkerhetslogg för inloggade användare
└── App.tsx            # Sessionstimer, auditloggning av CRUD-åtgärder
```

### Datalagring

All data lagras i webbläsarens `localStorage` (simulerad backend för demoändamål):

| Nyckel | Innehåll |
|---|---|
| `mxb_users` | Användarobjekt med bcrypt-hash (aldrig klartext) |
| `mxb_lockout_<email>` | Antal misslyckade försök och spärrens utgångstid |
| `mxb_audit_log` | Append-only lista med säkerhetshändelser (max 200 poster) |
| `mxb_session_active_until` | Unix-tidsstämpel för sessionens utgång |

> **Produktionsnotering:** I en produktionsmiljö ska lösenordshashning och sessionshantering ske server-side. Audit-loggar ska skickas till en tamper-evident loggserver.

---

## ISO 27001-mappning

Applikationen implementerar följande kontroller från **ISO/IEC 27001:2022, Annex A**:

| Kontroll | Referens | Implementering | Fil |
|---|---|---|---|
| Registrering och avregistrering av användare | A.9.2.1 | Unik e-post och användarnamn krävs vid registrering | `lib/auth.ts` |
| Hantering av privilegierad åtkomst | A.9.2.3 | Alla konton tilldelas rollen `user` (Least Privilege) | `lib/auth.ts` |
| Säkra inloggningsförfaranden | A.9.4.2 | Kontospärr efter 5 fel, vaga felmeddelanden | `lib/auth.ts` |
| Lösenordshanteringssystem | A.9.4.3 | bcrypt saltRounds=12, styrkeindikator, minlängd 8 tecken | `lib/auth.ts`, `AuthModal.tsx` |
| Kryptografiska kontroller | A.10.1.1 | bcryptjs med adaptivt salt för lösenordshashning | `lib/auth.ts` |
| Händelseloggning | A.12.4.1 | Audit trail för inloggning, CRUD, timeout, kontospärr | `lib/auditLog.ts` |
| Skydd av logginformation | A.12.4.2 | Append-only logg, max 200 poster, inga raderingsmöjligheter | `lib/auditLog.ts` |
| Åtkomstkontroll till system | A.9.4.1 | Endast autentiserade användare kan skapa/redigera/radera | `App.tsx`, `MessageCard.tsx` |
| Sessionstimeout | A.9.4 | Auto-utloggning efter 30 min inaktivitet | `lib/session.ts` |
| Skydd mot skadlig kod | A.12.2 | React escapar all JSX-output – inga `dangerouslySetInnerHTML` | `MessageCard.tsx`, `PostForm.tsx` |

---

## NIS2-mappning

Applikationen adresserar följande krav i **NIS2-direktivet (EU) 2022/2555, Artikel 21**:

| NIS2-krav | Artikel | Implementering |
|---|---|---|
| Autentisering och åtkomstkontroll | Art. 21.2 (i) | bcrypt-hashning, kontospärr, rollbaserad access control |
| Hantering av säkerhetstillbud | Art. 21.2 (b) | Audit trail loggar alla säkerhetshändelser med tidsstämpel |
| Driftkontinuitet och sessionsskydd | Art. 21.2 (c) | Automatisk sessionstimeout, varning vid utloggning |
| Skydd av personuppgifter | Art. 21.2 (h) | Lösenord hashas, e-post normaliseras, hash exponeras aldrig |
| Säkerhet i leveranskedjan | Art. 21.2 (d) | Beroenden granskas via `pnpm audit`, Dependabot kan aktiveras |
| Spårbarhet (Repudiation-skydd) | Art. 21.2 (e) | Varje åtgärd kopplas till autentiserad aktör i audit-loggen |

---

## STRIDE-hotmodellering

Hotmodelleringen identifierade följande risker och motåtgärder:

| Hot | STRIDE-kategori | Motåtgärd |
|---|---|---|
| Angripare utger sig för annan användare | **Spoofing** | Unik e-post/användarnamn per konto, bcrypt-hashning, kontospärr |
| Manipulation av andras meddelanden | **Tampering** | `isOwner`-kontroll i `MessageCard` – edit/delete endast för ägare |
| Användare förnekar utförda åtgärder | **Repudiation** | Audit trail loggar varje CRUD-åtgärd med aktör och tidsstämpel |
| Lösenord eller e-postadresser exponeras | **Information Disclosure** | Hash lagras (aldrig klartext), vaga felmeddelanden vid inloggning |
| Systemet överbelastas med inloggningsförsök | **Denial of Service** | Kontospärr (15 min) efter 5 misslyckade försök |
| Användare får högre behörighet än avsett | **Elevation of Privilege** | Least Privilege – rollen `user` tilldelas vid registrering, ingen admin-väg |

---

## Säkerhetskrav (fas 1)

Följande krav definierades i planeringsfasen och är samtliga implementerade:

1. **Åtkomstkontroll** – Användare får endast redigera och ta bort sina egna meddelanden.
2. **Lösenordshashning** – Lösenord ska hashas och aldrig lagras i klartext.
3. **Autentiseringskrav** – Endast autentiserade användare får skapa, redigera eller ta bort meddelanden.
4. **Meddelandevalidering** – Meddelanden ska valideras och vara mellan 3–140 tecken.
5. **XSS-skydd** – Användargenererat innehåll ska skyddas mot XSS genom sanitization eller escaping.

---

## Implementerade säkerhetskontroller (fas 2)

### 1. Lösenordshashning (`lib/auth.ts`)

```typescript
// bcryptjs med saltRounds=12 – ISO 27001 A.10.1
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
```

Lösenordet hashas med bcrypt innan det sparas. Hash exponeras aldrig utanför `auth.ts`.

### 2. Kontospärr (`lib/auth.ts`)

```typescript
// Spärr aktiveras efter MAX_ATTEMPTS (5) misslyckade försök – ISO 27001 A.9.4.2
if (updated.attempts >= MAX_ATTEMPTS) {
  updated.lockedUntil = Date.now() + LOCKOUT_MS; // 15 minuter
}
```

### 3. Vaga felmeddelanden (`lib/auth.ts`)

```typescript
// Avslöjar inte om e-posten existerar – skyddar mot Information Disclosure
if (!user) {
  throw new Error("Felaktig e-postadress eller lösenord.");
}
```

### 4. Audit trail (`lib/auditLog.ts`)

```typescript
// Append-only logg – ISO 27001 A.12.4.1 / NIS2 Art.21
addAuditEvent({ type: "LOGIN_SUCCESS", actor: user.username, detail: "Lyckad inloggning" });
```

### 5. Sessionstimeout (`lib/session.ts`)

```typescript
// 30 minuters inaktivitetsspärr – ISO 27001 A.9.4
const TIMEOUT_MS = 30 * 60 * 1000;
```

### 6. Access Control (`MessageCard.tsx`)

```typescript
// Ägarskontroll – Elevation of Privilege-skydd
const isOwner = currentUser !== null && currentUser === message.username;
// Edit/delete-knappar renderas ENDAST om isOwner === true
```

### 7. XSS-skydd (`MessageCard.tsx`, `PostForm.tsx`)

React escapar automatiskt alla värden som renderas via JSX-uttryck (`{...}`). Inga `dangerouslySetInnerHTML` används i applikationen. Kommentarer i koden förklarar detta explicit.

### 8. Input Validation (`PostForm.tsx`, `MessageCard.tsx`)

```typescript
const MIN_CHARS = 3;   // Fas 1-krav: minst 3 tecken
const MAX_CHARS = 140; // Fas 1-krav: max 140 tecken
const isValid = trimmed.length >= MIN_CHARS && remaining >= 0;
```

### 9. Lösenordsstyrkeindikator (`AuthModal.tsx`, `lib/auth.ts`)

```typescript
// ISO 27001 A.9.4.3 – poäng 0–4 baserat på längd, teckentyper och specialtecken
export function passwordStrength(password: string): number { ... }
```

---

## Filstruktur

```
/
├── README.md
├── package.json
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Huvudkomponent, sessionstimer, audit-loggning
│   │   ├── lib/
│   │   │   ├── auth.ts                # Autentisering, hashning, kontospärr
│   │   │   ├── auditLog.ts            # Audit trail (append-only)
│   │   │   └── session.ts             # Sessionstimeout och aktivitetslyssnare
│   │   └── components/
│   │       ├── AuthModal.tsx          # Login/register med lösenordsstyrka
│   │       ├── MessageCard.tsx        # Inlägg med access control och XSS-skydd
│   │       ├── PostForm.tsx           # Postformulär med input validation
│   │       └── AuditLogPanel.tsx      # Visuell säkerhetslogg
│   └── styles/
│       ├── theme.css                  # Design tokens (ljust/mörkt läge)
│       └── fonts.css                  # Typsnitt
└── ...
```

---

## Kom igång

```bash
# Installera beroenden
pnpm install

# Starta utvecklingsserver
pnpm dev
```

Applikationen körs på `http://localhost:5173`.

### Testa säkerhetsfunktionerna

| Funktion | Hur du testar |
|---|---|
| Kontospärr | Försök logga in med fel lösenord 5 gånger |
| Sessionstimeout | Logga in och vänta 30 min utan aktivitet |
| Audit trail | Logga in → klicka på "Säkerhetslogg" i sidomenyn |
| Lösenordsstyrka | Registrera ett konto och skriv ett svagt lösenord |
| Access control | Logga in som en användare och försök redigera en annan användares inlägg |

---

## Projektfaser

| Fas | Status | Beskrivning |
|---|---|---|
| Fas 1 – Planering | Klar | STRIDE-hotmodellering, säkerhetskrav, kravspecifikation |
| Fas 2 – Kodförståelse | Klar | Säkerhetskontroller implementerade och kommenterade i koden |
| Fas 3 – Granskning | Kommande | CodeQL, Dependabot, OWASP-analys |

---

*Applikation byggd med säkerhet som ledstjärna – ISO/IEC 27001:2022 · NIS2 (EU) 2022/2555*
