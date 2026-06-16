# Inlämning 1 - Planeringsfasen

## Fas 1 – Planering

### Projekt
Webbapplikationen låter användare:
- Skapa konto
- Logga in
- Skapa meddelanden
- Redigera meddelanden
- Ta bort meddelanden

## Hotmodellering (STRIDE)

### Spoofing
Angripare försöker utge sig för att vara en annan användare.

### Tampering
Manipulation av meddelanden eller annan data.

### Repudiation
Användare kan förneka utförda handlingar.

### Information Disclosure
Känslig information som lösenord eller användardata exponeras.

### Denial of Service
Systemet överbelastas med stora mängder förfrågningar.

### Elevation of Privilege
En användare får högre behörigheter än avsett.

## Säkerhetskrav

1. Användare får endast redigera och ta bort sina egna meddelanden.
2. Lösenord ska hashats och aldrig lagras i klartext.
3. Endast autentiserade användare får skapa, redigera eller ta bort meddelanden.
4. Meddelanden ska valideras och vara mellan 3–140 tecken.
5. Användargenererat innehåll ska skyddas mot XSS genom sanitization eller escaping.

## Säkerhetsprinciper

- Least Privilege
- Defense in Depth
- Secure Authentication
- Input Validation
- Access Control

## Slutsats
Genom STRIDE-modellen identifierades flera säkerhetsrisker kopplade till autentisering, åtkomstkontroll och användargenererat innehåll. Säkerhetskraven ovan har definierats för att minska dessa risker och kommer att användas som grund för kodanalys och granskning i kommande faser.
