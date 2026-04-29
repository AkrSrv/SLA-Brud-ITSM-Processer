# SLA Kommentar Manager

Dette projekt er en ny React + Vite app til at indlæse rå JSON fra dit SLA-flow, redigere AI-genererede kommentarer og gemme den endelige rapport.

## Funktioner

- Indlæs JSON direkte i tekstfeltet
- Indlæs JSON fra fil
- Vis og rediger rådata fra event-filen
- Rediger kommentarens 4 sektioner
- Gem den endelige rapport som JSON-fil

## Kom godt i gang

1. Åbn terminal i `sla-comment-manager`
2. Kør `npm install`
3. Kør `npm run dev`

## Struktur

- `src/App.tsx`: hovedapplikationen
- `src/App.css`: styling
- `index.html`: statisk Vite HTML

## Næste skridt

- Tilføj Dataverse integration til at gemme den endelige tekst.
- Tilføj mulighed for at hente basale felter fra `eventsText` automatisk.
- Udbyg med staging og approval-workflow for produktansvarlig.
