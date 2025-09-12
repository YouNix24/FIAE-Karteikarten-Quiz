# FIAEâ€‘Karteikartenâ€‘Quiz
![alt text](Preview.png)

Ein leichtgewichtiges, lokales Lernâ€‘ und Selbsttestâ€‘Tool zur Vorbereitung auf die AbschlussprÃ¼fung (AP1/AP2). Ziel ist es, schnell die eigenen Problemthemen zu erkennen und gezielt zu Ã¼ben â€“ ohne Installation, ohne Backend, direkt im Browser.

- Fragetafeln pro Themenblock (12 Fragen je Quiz)
- ZufÃ¤llige Antwortreihenfolge (kein â€žoben links ist immer richtigâ€œ)
- Ergebnisanzeige mit Prozent und Note, â€žAbgeschlossenâ€œâ€‘Badge in der Ãœbersicht
- Problemthemen: wertet Fehler Ã¼ber alle Versuche aus und listet nur echte SchwÃ¤chen
- Fortschritt bleibt lokal erhalten (LocalStorage) und kann als INI exportiert/importiert werden
- Fragen liegen als JSON vor und kÃ¶nnen leicht ergÃ¤nzt oder angepasst werden (keine SQLâ€‘Aufgaben enthalten)

Repo: `https://github.com/YouNix24/FIAE-Karteikarten-Quiz`


## Schnellstart

### Windows (empfohlen)

1. Repository herunterladen
   - Git: `git clone https://github.com/YouNix24/FIAE-Karteikarten-Quiz.git`
   - Oder als ZIP von GitHub herunterladen und entpacken
2. Ordner Ã¶ffnen und starten: `start_quiz_server.bat`
   - Der lokale Server startet und Ã¶ffnet automatisch deinen Standardâ€‘Browser
   - Die App ist dann unter `http://localhost:<PORT>/FIAE_Quiz.html` erreichbar

Alternative (ohne Batch): Die Datei `FIAE_Quiz.html` im Browser Ã¶ffnen und oben per Button die JSONâ€‘Dateien bzw. den `JSON/`â€‘Ordner manuell laden.

### macOS / Linux

- Mit Pythonâ€‘HTTPâ€‘Server
  - In den Projektordner wechseln und starten: `python3 -m http.server 8000`
  - Browser Ã¶ffnen: `http://localhost:8000/FIAE_Quiz.html`
- Oder mit Node Serve
  - `npx serve -l 8000`
  - `http://localhost:8000/FIAE_Quiz.html`

Hinweis: Im â€žfile://â€œâ€‘Modus (ohne Server) ist Autoâ€‘Scan der JSONâ€‘Dateien deaktiviert. Lade die JSONs dann Ã¼ber die Buttons â€žJSONâ€‘Dateien laden â€¦â€œ bzw. â€žJSONâ€‘Ordner wÃ¤hlen â€¦â€œ.


## Bedienung

- Startseite zeigt alle verfÃ¼gbaren Quizze (je 12 Karten)
- â€žStartenâ€œ Ã¶ffnet den Fragenâ€‘Runner
  - Navigation: ZurÃ¼ck/Weiter, Hinweis einblenden, â€žFertigâ€œ zum Auswerten
  - Antworten sind pro Frage zufÃ¤llig angeordnet
- Ergebnis: Korrekte/insgesamt, Prozent, Note, Fortschrittsbalken
- Abgeschlossenâ€‘Status: In der Ãœbersicht rechts oben je Karte als Badge sichtbar; bleibt beim nÃ¤chsten Start erhalten
- Dashboard (oben): Ãœbersicht Ã¼ber abgeschlossene Quizze, Versuche, Durchschnitt/Best/Schlechteste Note
- Problemthemen: Zeigt nur Themen mit mindestens einem Fehler, sortiert nach Fehlerzahl/Quote
- Verlauf/Statistik
  - â€žVerlauf lÃ¶schenâ€œ setzt alle Versuche/Statistiken zurÃ¼ck
  - Export/Import als INI Ã¼ber die Buttons


## Problemthemen â€“ wie es funktioniert

Das Tool fasst deine Antworten je Themengebiet zusammen (Versuche Ã¼ber die Zeit) und zeigt nur Themen mit echten Fehlern an. Die Zuordnung erfolgt automatisch anhand der Frageformulierung oder â€“ wenn vorhanden â€“ Ã¼ber Felder `topic` bzw. `tags` in der Frage. UnterstÃ¼tzte Themen (Auszug):

- Netzwerke
- Projektmanagement (inkl. Scrum/Kanban)
- ITâ€‘Sicherheit
- Web & HTTP
- Cloud & Virtualisierung
- Speicher & RAID
- QualitÃ¤t & Tests
- Betriebssysteme & Tools
- Recht & BWL
- Softwareentwurf & UML
- Allgemeine ITâ€‘Grundlagen (nur wenn keine andere Zuordnung passt)

Tipp: Setze optional `topic` (String) oder `tags` (String/Array) in den JSONâ€‘Fragen, um die Zuordnung explizit zu steuern.


## Inhalte anpassen (JSON)

Alle Fragen liegen im Ordner `JSON/` als `QuizNN.json`. Jede Datei enthÃ¤lt ein Array `cards` mit Objekten dieses Schemas:

```
{
  "cards": [
    {
      "question": "Deine Frage als vollstÃ¤ndiger Satz?",
      "choices": ["Antwort A", "Antwort B", "Antwort C", "Antwort D"],
      "correct_index": 0,
      "hint": "Kurzer Hinweis zum Verstehen",
      "topic": "(optional) Kategorie",
      "tags": ["(optional)", "Stichworte"]
    }
  ]
}
```

Richtlinien:
- 12 Fragen je Quizdatei (einheitlich fÃ¼r die App)
- Keine SQLâ€‘Aufgaben (fallen in AP1 weg)
- Keine doppelten Fragen Ã¼ber verschiedene Quizze hinweg
- AussagekrÃ¤ftige, nicht abgekÃ¼rzte Formulierungen (z.â€¯B. statt â€žOCP heiÃŸtâ€¦?â€œ: vollstÃ¤ndige Beschreibung/Frage)

Nach Ã„nderungen einfach die Seite neu laden.


## Projektstruktur

- `FIAE_Quiz.html` â€“ Startseite/Anwendung
- `JS/app.js` â€“ Logik (Laden der JSON, Runner, Auswertung, Problemthemen, Persistenz)
- `CSS/style.css` â€“ Layout und Styles
- `JSON/QuizNN.json` â€“ Fragenkataloge
- `start_quiz_server.bat` â€“ Startet lokalen Server auf Windows (Ã¶ffnet Standardâ€‘Browser)
- `server.ps1` â€“ Simpler PowerShellâ€‘Server mit Logging in `Logs/`


## HÃ¤ufige Fragen (FAQ)

- â€žIch sehe die JSONs nicht im file:// Modusâ€œ
  - Im Dateimodus ist das automatische Scannen aus SicherheitsgrÃ¼nden aus. Nutze die Buttons oben, um JSONâ€‘Dateien/Ordner zu laden, oder starte den lokalen Server.
- â€žDie Ã„nderungen werden nicht angezeigtâ€œ
  - Mit Strg+F5 hart neu laden (Browsercache umgehen). Bei Serverstart Ã¼ber Batch wird dein Standardâ€‘Browser genutzt.
- â€žWo werden meine Ergebnisse gespeichert?â€œ
  - Lokal im Browser (LocalStorage). Export/Import Ã¼ber INI ist mÃ¶glich.


## Download & Installation (GitHub)

- Repo: `https://github.com/YouNix24/FIAE-Karteikarten-Quiz`
- Clone:
  - `git clone https://github.com/YouNix24/FIAE-Karteikarten-Quiz.git`
  - `cd FIAE-Karteikarten-Quiz`
  - Windows: `start_quiz_server.bat`
  - macOS/Linux: `python3 -m http.server 8000` und dann `http://localhost:8000/FIAE_Quiz.html`
- ZIP: Ãœber GitHub â€žCode â†’ Download ZIPâ€œ, entpacken und wie oben starten


## Hinweise

- Das Tool arbeitet vollstÃ¤ndig lokal. Es sendet keine Daten nach auÃŸen. Der mitgelieferte PowerShellâ€‘Server schreibt reine Textâ€‘Logs in `Logs/` fÃ¼r das lokale Debugging.
- Wenn du das mitgelieferte PDF â€žZusammenfassung_AbschlussprÃ¼fung â€“ Fast alle Themen.pdfâ€œ ersetzen willst, lege die neue Datei einfach neben die HTML ab und passe ggf. den Link in der Topbar an.

Viel Erfolg beim Lernen â€“ und viel SpaÃŸ beim gezielten SchlieÃŸen deiner WissenslÃ¼cken!
## Themen (Quiz01â€“11)

Themen je Quiz basierend auf den 	opic-Feldern in den JSON-Dateien:

- Quiz01: Betriebssysteme, DHCP
- Quiz02: OSI-Modell
- Quiz03: IT-Sicherheit
- Quiz04: Netzwerktopologien
- Quiz05: IP-Adressierung, Speicher & RAID, Stakeholder
- Quiz06: Anforderungsmanagement, ERP, Organisation & FÃ¼hrung, QualitÃ¤t & Prozesse, SLA & Betrieb
- Quiz07: NetzwerkgerÃ¤te, Versionierung
- Quiz08: DDR-RAM, NetzwerkgerÃ¤te
- Quiz09: Vorgehensmodelle
- Quiz10: Logikgatter, UEFI/BIOS, USV-Berechnung
- Quiz11: Programmlogik

Gesamtliste aller Themen aus Quiz01â€“11 (einmalig, alphabetisch):

- Anforderungsmanagement
- Betriebssysteme
- DDR-RAM
- DHCP
- ERP
- IP-Adressierung
- IT-Sicherheit
- Logikgatter
- NetzwerkgerÃ¤te
- Netzwerktopologien
- Organisation & FÃ¼hrung
- OSI-Modell
- Programmlogik
- QualitÃ¤t & Prozesse
- SLA & Betrieb
- Speicher & RAID
- Stakeholder
- UEFI/BIOS
- USV-Berechnung
- Versionierung
- Vorgehensmodelle

