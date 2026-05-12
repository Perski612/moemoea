# Fitness App UI Design

_Started 2026-05-12 10:59 UTC_

---

## User



## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- language: German (Deutsch)
- platform: IOS phone 17 Pro
- screens: Dashboard / Post-Run Stats, Rider Profile & Bike Garage, Leaderboard, Style Feed (video contest)
- neon_color: 0
- avatar_style: Pixel art / retro 8-bit
- variations: Explore as many as you can
- data_vibe: Mixed: gritty headers + clean charts

## Assistant

_[tool: update_todos]_

_[tool: copy_starter_component]_

_[tool: copy_starter_component]_

Perfekt! Let me start building. My design system: **"Dirt & Tech"** — near-black warm backgrounds (`#0c0a07`), acid green neon (`#39ff14`) accents, Space Grotesk for UI + Space Mono for telemetry readouts. Gritty headers with clean data charts. Let me grab the starters first.

_[tool: read_file]_

_[tool: read_file]_

_[tool: update_todos]_

_[tool: write_file]_

Good, I have everything I need. Now building the full prototype — three files to stay clean and modular.

_[tool: update_todos]_

_[tool: write_file]_

_[tool: update_todos]_

_[tool: write_file]_

Now the main app file — iOS frame, tab bar, and tweaks:

_[tool: done]_

_[tool: update_todos]_

_[tool: fork_verifier_agent]_

**TRAILRIOT** is live — no errors. Here's what you can explore:

**4 screens** (bottom nav):
- 📡 **Dashboard** — Post-Run Telemetrie mit Hero-Airtime-Anzeige, G-Force/Speed/Distanz-Kacheln und Verlaufs-Chart
- 🎬 **Feed** — Style-Contest-Feed mit QR-Validierungshinweis, Clip-Karten und interaktivem Fire-Button
- 🏆 **Rangliste** — Podium + Liste mit 4 Tabs (Airtime / G-Kraft / Speed / Style), eigener Eintrag highlighted
- 👤 **Profil** — Pixel-Art-Avatar (8-bit), XP-Balken, Bike Garage mit 2 Bikes, Achievement-Grid

**Tweaks** (Zahnrad-Icon oben rechts):
- Akzentfarbe: Acid Green / Cyan / Orange / Purple / Gold
- Kartenstil: Outlined / Glas / Solid
- Dashboard-Layout: **HUD** (Racing-Telemetrie) vs. **Cards** (Clean Analytics)

Mögliche nächste Schritte:
- QR-Scan → Recording-Flow als eigene Ansicht
- Karma & Rewards / Gutschein-Safe-Screen
- Sharing-Funktion (Stats-Card für Instagram)
- Animierte Übergänge beim Tab-Wechsel

## User

in dem bild siehst du den style von den Instagram beitragen. also die Farbe und Schriftart. Mir gefällt bis jetzt der Prototyp sehr, aber es ist momentan zu wenig unser Tral einfach. Es sieht nach einer mega geilen App aus, aber es wird nicht wirklich klar dass es eine MTB App ist. Zuerst soll es wirklich nur für unsren "MOE MOEA Trails" sein. Also passe das etwas an. Ausserdem wird nicht klar, wo ich genau ein Video hochladen kann. Wichtig ist nur dass in dem Video am Anfang der QR sichtbar ist. In den Einstellungen will ich eigentlich mehr das Pixel MTB oder Hardtail konfigurieren mit mehr Möglichkeiten wie Coil Dämpfer oder normal, Farbe des Bikes,... Ich würde auch dieses als anzeige benutzen oben rechts und in z.B dem Videofeed und der Rangliste die Person Pixel mit dem BIke am besten.

## Assistant

_[tool: view_image]_

_[tool: view_image]_

_[tool: update_todos]_

Perfekt — ich sehe die Marken-DNA: Acid Green, dunkler Forest-Background, der blocky "MDF MOEA TRAILS" Wordmark (Bebas Neue-Stil), rotes "TRAILS"-Accent. Hier ist mein Update-Plan:

- **Branding**: „MOE MOEA / TRAILS" überall
- **Avatar**: Handlebars sichtbar, Bike-Farbe/Typ/Gabel konfigurierbar in der Live-Preview
- **Feed**: Klarer Video-Upload-Flow (QR → Aufnehmen → Hochladen)
- **Header**: Globaler Header mit Logo + User-Avatar oben rechts

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

Now the main app file with AppHeader, upload modal, and bikeConfig state:

_[tool: done]_

_[tool: update_todos]_

_[tool: fork_verifier_agent]_

Alles sauber geladen! Hier was neu ist:

**MOE MOEA Branding**
- „MOE MOEA / TRAILS" Header oben in Bebas Neue — rotes TRAILS-Accent wie im Logo
- Alle Trail-Namen auf „MOE MOEA Trails, Neckartal" umgestellt
- Teams: „MOE MOEA Crew", „Trail Devils" etc.

**Pixel-Avatar oben rechts** 
- Persistenter Header mit deinem konfigurierten Avatar — aktualisiert sich live

**Avatar Konfigurator** (im Profil-Tab):
- **Fahrrad-Typ**: Hardtail / Fully (Fully zeigt Hinterbau-Dämpfer im Pixel-Art)
- **Federgabel**: Air / Coil (Coil zeigt Spiralfedern im Pixel-Art)
- **Rahmen-Material**: Alu / Carbon
- **Rahmen-Farbe**: 6 Farb-Swatches (Schwarz, Grau, Blau, Rot, Grün, Gold)
- **Trikot-Farbe**: 3 Optionen — Avatar-Vorschau aktualisiert live

**Video-Upload-Flow** (Feed → „Video einreichen"):
- Schritt 1: QR-Code scannen mit Pixel-Art QR + Anleitung
- Schritt 2: Aufnahme mit Viewfinder, Timer, Record-Button
- Schritt 3: Hochladen mit Fortschrittsbalken + Bestätigung

**Tweaks** bleiben: Akzentfarbe, Kartenstil, Dashboard-Layout

Mögliche nächste Schritte:
- Den echten MDF MOEA Trail-Namen/Logo als SVG einbauen
- Karma & Rewards / Gutschein-Screen
- Stats-Card Export für Instagram Stories

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

Alles grün ✅ — der Verifier hat alle 4 Tabs, den Header-Avatar und den Upload-Flow bestätigt.

Kein Problem — einfach sagen was als Nächstes kommen soll! Mögliche Richtungen:

- **Karma & Rewards Screen** — Gutschein-Safe, Meilensteine, Partner-Rabattcodes
- **Instagram Stats-Card Export** — Avatar + Airtime + Trail-Logo als Share-Bild
- **Onboarding Flow** — Profil erstellen, Bike erfassen, ersten QR scannen
- **Trail-Mängelbericht** — Foto + Kategorie + Karte
- **Weitere Design-Variationen** — andere Farbthemen, Layout-Optionen

Was darf ich als Nächstes bauen?

