# 📖 Game Design Document

> **Purpose:** Consolidated blueprint containing **all** feature ideas, mechanics, technical notes, and psychological engagement techniques discussed so far for the fast‑paced FPS project.

---

## 📑 Table of Contents
1. [GUI & HUD](#gui--hud)
2. [World & Environment](#world--environment)
3. [Player Character](#player-character)
4. [Weapons & Combat Mechanics](#weapons--combat-mechanics)
5. [Enemies & AI](#enemies--ai)
6. [Game Modes](#game-modes)
7. [Inventory & Items](#inventory--items)
8. [Visual Effects](#visual-effects)
9. [Audio](#audio)
10. [Multiplayer & Networking](#multiplayer--networking)
11. [Progression & Rewards](#progression--rewards)
12. [Social & Competitive Features](#social--competitive-features)
13. [Technical Infrastructure](#technical-infrastructure)
14. [Psychological Engagement Techniques](#psychological-engagement-techniques)
15. [Map Design Principles](#map-design-principles)
16. [Performance & “Game Feel”](#performance--game-feel)
17. [Testing & Quality Assurance](#testing--quality-assurance)
18. [Monetization](#monetization)

---

## GUI & HUD
### Core GUI Elements  
- [ ] **Minimap**  
- [ ] **Compass**  
- [ ] **Weapon selector / quick wheel**  

### HUD Elements  
- [ ] Ammo, helse (HP) & skins‑ikon  
- [ ] Killfeed  
- [ ] Kill / Death counter  
- [ ] Team‑mate stats  
- [ ] Achievement notifications  
- [ ] Mission / objective tracker  
- [ ] Chat (tekst)  
- [ ] Voice‑chat (push‑to‑talk, volumkontroll)  

---

## World & Environment
- [ ] Korrekt **scale** på modeller for rigid body & kollisjon  
- [ ] **Google Ads‑modul**  
- [ ] **Facebook‑integrasjon**  
- [ ] Kart‑spesifikke animasjoner (maskiner, dører, heiser, bevegelige plattformer)  
- [ ] Interaktive miljø‑objekter (hack‑terminaler, kameraer)  
- [ ] Ødeleggbare vegger, hinder, dynamisk fysikk ved eksplosjoner  
- Ambient‑lyder (helikopter, fjerne skudd) & dekorative detaljer (dyr, planter)  
- Nye **levels**  
  - Hide‑and‑seek («Gjemsel‑level»)  
  - **Bonanza** (100 roboter angriper)  
- Miljøeffekter: vær (regn, snø, vind), dag / natt‑syklus  

---

## Player Character
- [ ] Nye våpen‑ og lade‑animasjoner  
- [ ] Flere våpen‑typer  
- [ ] Kollisjon på våpnene  
- [ ] Tilpassbare skins, utstyr & hodetilbehør  
- [ ] Korrekt modell‑scale for kollisjon  
- **Movement abilities**  
  - Sprint • Crouch • Slide • Wall‑run  
  - Double‑jump / Grappling‑hook  
  - **Air‑control** & «Bunny hopping»  
  - Stamina‑system for balansert sprinting  
  - Minimert recovery‑time etter handlinger (rask våpenbytte / landing)  

---

## Weapons & Combat Mechanics
- [ ] Presis rekyl‑demping & spray‑kontroll  
- [ ] Spray / spread & våpenfeil ved overoppheting  
- [ ] Ragdoll‑physics ved dødsfall  
- Mikro‑progresjon (mods / attachments)  
- Sekundære funksjoner med kort cooldown  
- «Risk vs Reward»: f.eks. mer skade på lang avstand, men vanskeligere å treffe  
- **Momentum‑system** som øker fart etter kills  

---

## Enemies & AI
- [ ] Flere fiendetyper (scouting‑bot, pansret behemoth‑bot, mini‑bosser)  
- [ ] AI‑nivåer  
  - Grunnleggende patrol, seek & attack  
  - Avanserte taktikker: flanke, dekning, samarbeid  
- Bot‑infiltrering (for balansert matchmaking)  
- Belønninger: XP, loot‑drops, midlertidige power‑ups  
- Flere NPC‑animasjoner  

---

## Game Modes
- [ ] **Team Deathmatch**  
- [ ] **Free‑for‑All**  
- [ ] **Battle Royale** (safe‑zone, luftdropp)  
- [ ] **Capture the Flag**, **Domination**, **King of the Hill**  
- [ ] **Chase the Flag**  
- [ ] **Horde Mode** (PvE) & **Co‑op** oppdrag  
- [ ] **Ai / NPC**‑baserte moduser  

---

## Inventory & Items
- [ ] Helsepakker, skjold, hurtighets‑boost  
- [ ] Våpenkategorier: Rifle • Pistol • Sniper • SMG • Hagle • Rakettkaster  
- [ ] Granater: Frag • Flash • Smoke • Molotov  
- [ ] Power‑ups & mid‑match drops  

---

## Visual Effects
- Kamera‑risting ved treff & eksplosjoner  
- Partikkel‑effekter: støv, gnister, ild, røykfaner, eksplosjoner  
- Skjermfeedback  
  - [ ] Rød flash ved skade  
  - [ ] Blodflekker på skjerm  
  - [ ] Slow‑mo zoom‑ut ved dødsfall / spektakulære kills  
- «Juicy» mikro‑zoom på headshots  

---

## Audio
- [ ] Dynamisk musikk som endres med kampintensitet  
- [ ] Tematiske bakgrunnsløyfer pr. kart  
- [ ] 3D‑posisjonert lyd (skudd, fottrinn, eksplosjoner)  
- [ ] Headshot‑sound cue & killstreak‑voicelines  
- Musikk / lydeffekter på roboter  

---

## Multiplayer & Networking
- [ ] Skill‑basert matchmaking & ping‑filter  
- [ ] Dedikerte servere + community‑servere  
- [ ] Server‑browser med søkefilter  
- [ ] Server‑authoritative arkitektur • Lag‑kompensasjon  
- [ ] Anti‑cheat & rapporteringssystem  
- **Netcode**‑optimalisering: Client‑side prediction, posisjon > animasjon > kosmetikk  
- **Deathcam**: se fra fiendens perspektiv • Spectator (free / 1st / 3rd person)  
- **Replays & Highlights**:  
  - Automatisk lagring av siste 30 sekunder  
  - Kamera‑ruter for e‑sport‑sendinger  

---

## Progression & Rewards
- [ ] Spiller‑XP & Våpen‑XP, nivåer, opplåsbare perks  
- [ ] Sesongbasert **Battle Pass** (skins, emotes, sprays)  
- [ ] Daglige / ukentlige utfordringer  
- [ ] Loot & kosmetikk med sjeldenhetsgrader  
- Penalty for å slutte midt i spillet  
- Mikro‑belønninger hvert ~30 sekunder (kills, assists, objektiver)  
- Streak‑bonuser (eksponentielt økende)  

---

## Social & Competitive Features
- [ ] Venneliste & Party‑system (inviter / lobby‑link)  
- [ ] Klansystem med interne turneringer & klanmerker  
- [ ] Leaderboards (global, regional, venner)  
- [ ] Real‑time oppdatering under spillet  
- [ ] Guild / klan‑oppdrag som krever samarbeid  
- Referral‑bonuser & gruppe‑XP‑boost  
- Rivaliserings‑system som tracker «nemesis»‑spillere  

---

## Technical Infrastructure
- **Performance & Cross‑platform**  
  - 60 FPS + på svak maskinvare  
  - LOD, FOV, skygger, teksturkvalitet  
  - PC / Console / Mobile opsjon  
- **Network Stability**  
  - Lag‑kompensasjon, ping‑optimalisert layout  
  - UDP / WebSocket synkronisering  
  - Prioritering: Posisjon > animasjon > kosmetikk  
- **Optimization**  
  - Okklusjonskulling  
  - Modulær arkitektur & gjenbrukbare byggesteiner  
  - Belysningssoner fremfor full dynamisk lys  
- **Analytics & Telemetry** for balansejusteringer  
- Crash‑logs, bug‑rapporter, CI/CD pipeline  

---

## Psychological Engagement Techniques
### Dopamin‑triggere & Belønnings‑sykluser
- Lootbokser / spinnhjul  
- Escrow‑belønninger med nedtelling (krever innlogging)  
- Eksponentielle streak‑bonuser  
- Mikro‑belønninger hvert 30 sek  
- Tilfredsstillende lydeffekter (klink, melodiske killstreak‑lyder)

### FOMO (Fear Of Missing Out)
- Tidsbegrensede events & skins  
- Sesonginnhold som forsvinner  
- Daglige utfordringer med reset  
- Visualisering av hva spilleren går glipp av

### Matchmaking‑psykologi
- Skill‑basert matchmaking som varierer vanskelighetsgrad  
- «Pity system» etter tap, win‑streak‑breaker  
- Bot‑infiltrering for enklere kills

### Kompetitiv Synlighet
- Rangemblemer, prestige‑system  
- Skill‑baserte våpeneffekter  
- Offentlige statistikker (K/D, HS %)

### Flow‑State Optimalisering
- Dynamisk vanskelighet i sanntid  
- Perfekt balansert respawn‑timer (puste – ikke kjede seg)  
- 5‑7 min kamper (psykologisk sweet‑spot)  
- «Nesten der»‑indikatorer når du nesten vinner duell

### Teknisk‑psykologiske Triks
- Subtil aim‑assist (særlig på mobil)  
- Litt større hit‑boxes («bullet magnetism»)  
- Rekyl‑mønster som blir gradvis vanskeligere  
- RNG som av og til favoriserer spilleren

### Sosiale Bindings‑Mekanismer
- Klan‑oppdrag, gruppebonuser  
- Venn‑referral‑system  
- Hjelp‑bonuser for veteraner som hjelper nybegynnere  
- Live leaderboards under match

### Oppdagelse & Overraskelse
- Hemmelige områder / Easter Eggs  
- “Evolving world” – subtile kartendringer over tid  
- Tilfeldige power‑ups & events som endrer dynamikk

---

## Map Design Principles
1. **Flyt & Bevegelsesmønstre**  
   - 3‑lane‑struktur • Sirkulær bevegelse • Ingen blindveier  
   - Naturlige choke points med alternative ruter  
   - Varierte siktlinjer (kort / medium / lang)  
   - Vertikalitet med risiko / belønning

2. **Dekning & Åpenhet**  
   - 70 / 30‑regelen (70 % dekning)  
   - Asymmetrisk symmetri  
   - “Power positions” med flere angrepsvinkler  
   - Risk vs Reward‑soner

3. **Visuell Lesbarhet**  
   - Klare fargekontraster • Lyssetting som fremhever viktige soner  
   - Silhuett‑orientert design • Minimalistisk, men karakteristisk

4. **Kognitive Feller & Muligheter**  
   - “Honeypot”‑områder • Underbevisste ledetråder  
   - «Payoff moments» for spektakulære kills  
   - Alternative ruter som føles hemmelige

5. **Optimalisering**  
   - Okklusjonskulling • LOD‑vennlig geometri  
   - Modulær bygging • Definerte spillervolumer  
   - Oppdelt belysning • Ping‑optimalisert layout

6. **Iterativ Utvikling**  
   - Gråboks‑testing • Varmekart‑analyse • A/B‑testing  
   - Playtester‑feedback • Evolusjonsdesign

---

## Performance & “Game Feel”
- **Snappy controls**: Lav input‑latens, høy FPS  
- Strippet fysikk / bevegelsessystem (ingen tunge animasjoner)  
- Ingen unødvendige skjermrystelser / overgangs‑animasjoner  
- Spilleren skal skyte noen < 5 sek etter spawn  
- Superenkel grafikk (lavpoly / cel‑shading)  
- Små teksturer • Optimaliserte collider‑e • Lettvekts partikler  
- 60 + FPS selv i nettleser  
- Quick match med lav ventetid  

---

## Testing & Quality Assurance
- [ ] Lukket **Alpha** med integrert feedback‑modul  
- [ ] Åpen **Beta** med spilleranmeldelser  
- [ ] Analytics & Telemetri for balanse  
- Crash‑logs & bug‑rapporter  
- Kontinuerlig integrasjon & automatiserte tester  

---

## Monetization
- [ ] Premium **Season Pass** + DLC med eksklusive belønninger  
- [ ] In‑game shop (kosmetikk: skins, emotes, voice‑packs)  
- [ ] Lootbokser / spinnhjul (chance‑based)  
- [ ] Trading / markedsplass  
- Escrow‑belønninger & “pity timers”  

---

*End of document – all known ideas included.*  
