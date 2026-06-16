# Fas 3 – Granskning

## Verktyg som använts

### GitHub CodeQL
Statisk kodanalys som automatiskt skannar koden efter säkerhetsmönster och potentiella sårbarheter. CodeQL analyserar kodflödet och identifierar mönster som kan leda till säkerhetsproblem.

### GitHub Dependabot
Automatisk skanning av projektets beroenden (npm-paket) mot kända CVE-databaser. Dependabot identifierar föråldrade paket med kända säkerhetsproblem och föreslår uppdateringar.

---

## CodeQL – Fynd (8 st)

### Missing rate limiting – High (7 st)
**Berörda rader:** `backend/server.js` rad 28, 76, 126, 139, 149, 149, 168

CodeQL identifierade att API-endpoints saknar rate limiting, det vill säga begränsning av hur många förfrågningar en användare kan skicka inom en viss tidsperiod. Detta innebär att en angripare kan bombardera servern med tusentals inloggningsförsök eller meddelanden utan att bromsas.

**Koppling till säkerhetsprinciper:**
- STRIDE: Denial of Service (DoS)
- OWASP Top 10: A05 – Security Misconfiguration

**Åtgärdsförslag:** Implementera rate limiting med ett npm-paket som `express-rate-limit`. Exempel:
```js
import rateLimit from "express-rate-limit"
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })
app.use(limiter)
```

---

### Permissive CORS configuration – Medium (1 st)
**Berörd rad:** `backend/server.js` rad 20

CodeQL flaggade att CORS är konfigurerat med `origin: "*"`, vilket tillåter anrop från alla domäner. I produktion innebär detta att vilken webbplats som helst kan skicka förfrågningar till API:et.

**Koppling till säkerhetsprinciper:**
- STRIDE: Elevation of Privilege
- OWASP Top 10: A05 – Security Misconfiguration

**Åtgärdsförslag:** Begränsa CORS till specifika betrodda origins i produktion:
```js
cors({ origin: "https://din-app.com" })
```
I utvecklingsmiljö är `"*"` acceptabelt, men bör aldrig användas i produktion.

---

## Dependabot – Fynd (15 st)

### jsonwebtoken – High + Moderate (2 st)
Dependabot identifierade två sårbarheter i `jsonwebtoken`, det paket som används för att signera och verifiera JWT-tokens i applikationen.

- **High:** Unrestricted key type kan leda till användning av svaga legacy-nycklar
- **Moderate:** Sårbarhet i signaturvalidering som kan möjliggöra förfalskning av tokens

**Koppling till säkerhetsprinciper:**
- STRIDE: Spoofing (förfalskning av identitet via manipulerade tokens)
- OWASP Top 10: A02 – Cryptographic Failures

**Åtgärdsförslag:** Uppdatera `jsonwebtoken` till senaste version samt specificera algoritm explicit:
```js
jwt.sign(payload, secret, { algorithm: "HS256", expiresIn: "2h" })
```

---

### node-tar – High (5 st)
Flera sårbarheter relaterade till path traversal i `node-tar`. Dessa är transitive dependencies (används indirekt av andra paket) och påverkar inte applikationens kärnfunktionalitet direkt, men bör åtgärdas genom paketuppdateringar.

**Koppling till säkerhetsprinciper:**
- OWASP Top 10: A06 – Vulnerable and Outdated Components

---

### vite – Moderate + Low (4 st)
Dependabot flaggade fyra sårbarheter i Vite (development-verktyget). Dessa är märkta som "Development" och påverkar inte produktionsmiljön, men bör ändå uppdateras.

---

### qs – Moderate (1 st)
En DoS-sårbarhet i `qs`-paketet där `qs.stringify` kraschar med ett specifikt inmatningsformat. Transitiv dependency via Express.

**Koppling till säkerhetsprinciper:**
- STRIDE: Denial of Service
- OWASP Top 10: A06 – Vulnerable and Outdated Components

---

## Manuella fynd (Fas 2) vs Automatiserade verktyg (Fas 3)

| Brist | Hittad av | Åtgärdad |
|-------|-----------|----------|
| DELETE saknade autentisering | Manuell granskning | ✅ Ja |
| Längdvalidering saknades i backend | Manuell granskning | ✅ Ja |
| Delete-knapp visades för alla | Manuell granskning | ✅ Ja |
| Missing rate limiting | CodeQL | ⚠️ Noterad, ej åtgärdad |
| Permissive CORS | CodeQL | ⚠️ Acceptabel i dev |
| jsonwebtoken-sårbarhet | Dependabot | ⚠️ Kräver paketuppdatering |
| node-tar-sårbarheter | Dependabot | ⚠️ Kräver paketuppdatering |

---

## Slutsats

Granskningen med CodeQL och Dependabot identifierade totalt 23 fynd – 8 från kodanalys och 15 från beroendeskanningen. De mest kritiska fynden från Fas 2 (saknad autentisering på DELETE, avsaknad av längdvalidering) identifierades genom manuell granskning och har åtgärdats i koden.

De automatiserade verktygen fångade brister som är svårare att hitta manuellt, framför allt saknad rate limiting och kända CVE:er i npm-paket. Dessa utgör reella risker kopplade till OWASP Top 10 (A05, A06) och STRIDE (DoS, Spoofing) och bör åtgärdas innan applikationen driftsätts i produktion.

Sammantaget kompletterar manuell granskning och automatiserade verktyg varandra väl – manuell granskning hittade logikfel i åtkomstkontroll, medan verktygen identifierade infrastruktur- och beroendebrister.
