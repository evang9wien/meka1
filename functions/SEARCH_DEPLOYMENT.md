# 🔍 Firebase Function: Liedtext-Suche - Deployment & Test Guide

## 📋 Was wurde implementiert?

### 1. **Server-seitige Suche** (`functions/index.js`)
- Neue Function: `searchLieder`
- Sucht in Liedertexten und Titeln
- Gibt nur IDs und Snippets zurück (minimaler Datenverbrauch)
- Authentifizierung und Rollen-Check integriert

### 2. **Client-Integration** (`src/components/svelte/ComboLiederListeFB.svelte`)
- Verwendet Firebase Functions SDK
- Fallback auf lokale Suche bei Fehler
- Loading-Anzeige während Suche

---

## 🧪 TESTEN (3 Optionen)

### **Option 1: Lokales Testen mit Firebase Emulator** (Empfohlen)

#### Schritt 1: Firebase Emulator installieren
```bash
# Falls noch nicht installiert
npm install -g firebase-tools

# In deinem Projekt-Verzeichnis
cd /Users/andreaseidmann/Development/meka/meka1
```

#### Schritt 2: Emulator starten
```bash
# Functions Emulator starten
firebase emulators:start --only functions

# Output sollte sein:
# ✔  functions[europe-west1-searchLieder]: http function initialized (http://127.0.0.1:5001/evang9-combo-4cb8e/europe-west1/searchLieder)
```

#### Schritt 3: Test mit curl
```bash
# Test-Request (ersetze TOKEN mit echtem Firebase Auth Token)
curl -X POST \
  http://127.0.0.1:5001/evang9-combo-4cb8e/europe-west1/searchLieder \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "searchTerm": "Halleluja"
    }
  }'
```

#### Schritt 4: Astro Dev-Server mit Emulator
```bash
# Terminal 1: Emulator
firebase emulators:start --only functions

# Terminal 2: Astro Dev
npm run dev

# Dann in Browser: http://localhost:4321/combo/comboliederlisteFBpage
```

**Wichtig**: In `src/components/svelte/ComboLiederListeFB.svelte` für lokales Testen:
```javascript
// Für Emulator (nur während Entwicklung!)
functions = getFunctions(app);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);
```

---

### **Option 2: Direktes Deployment und Test auf Firebase**

#### Schritt 1: Function deployen
```bash
# Nur Functions deployen (schneller als alles)
firebase deploy --only functions

# Output:
# ✔  Deploy complete!
# Function URL (searchLieder(europe-west1)): https://europe-west1-evang9-combo-4cb8e.cloudfunctions.net/searchLieder
```

#### Schritt 2: Test in Production
```bash
# 1. Astro Build
npm run build

# 2. Alles deployen
firebase deploy

# 3. Testen auf: https://evang9.wien/combo/comboliederlisteFBpage
```

---

### **Option 3: Automatisches Deployment via GitHub Actions** (Produktiv)

#### Schritt 1: Code committen
```bash
git add functions/index.js
git add src/components/svelte/ComboLiederListeFB.svelte
git add functions/SEARCH_DEPLOYMENT.md
git commit -m "Add server-side search function for Liedertexte"
```

#### Schritt 2: Pushen
```bash
git push origin main
```

#### Schritt 3: GitHub Actions beobachten
1. Gehe zu: https://github.com/[dein-repo]/actions
2. Warte auf "Deploy to Firebase Hosting on merge"
3. Prüfe Logs:
   - ✅ Build Project
   - ✅ Deploy to firebase
   - ✅ Functions deployed

#### Schritt 4: Testen
- Öffne: https://evang9.wien/combo/comboliederlisteFBpage
- Logge dich ein
- Teste Suche im "Suche im Liedtext" Feld

---

## 🔍 TEST-SZENARIEN

### Test 1: Erfolgreiche Suche
```
Input: "Halleluja"
Erwartung: Liste mit allen Liedern, die "Halleluja" enthalten
Console: "Found X results for 'Halleluja'"
```

### Test 2: Keine Ergebnisse
```
Input: "xyz123"
Erwartung: Leere Liste
Console: "Found 0 results for 'xyz123'"
```

### Test 3: Zu kurzer Suchbegriff
```
Input: "a"
Erwartung: Keine Suche, Liste bleibt unverändert
```

### Test 4: Fehlerbehandlung
```
Szenario: Netzwerkfehler
Erwartung: Fallback auf lokale Suche
Console: "Server-side search error: ..." + "Falling back to client-side search"
```

---

## 📊 MONITORING & DEBUGGING

### Firebase Console Logs ansehen
```bash
# Echtzeit-Logs
firebase functions:log --only searchLieder

# Oder in Firebase Console:
# https://console.firebase.google.com/project/evang9-combo-4cb8e/functions/logs
```

### Browser Console prüfen
```javascript
// Öffne DevTools (F12)
// Console Tab
// Suche nach:
"Server-side search for: [Suchbegriff]"
"Search results: {results: [...], count: X}"
"Found X songs matching '[Suchbegriff]'"
```

### Performance messen
```javascript
// In Browser Console
console.time('search');
// Suche durchführen
console.timeEnd('search');
// Sollte < 2 Sekunden sein
```

---

## 🚀 DEPLOYMENT-CHECKLISTE

### Vor dem Deployment:
- [ ] `functions/index.js` gespeichert
- [ ] `src/components/svelte/ComboLiederListeFB.svelte` gespeichert
- [ ] Emulator-Test erfolgreich (optional)
- [ ] Git Status geprüft: `git status`

### Deployment:
- [ ] Code committet: `git commit -m "Add search function"`
- [ ] Gepusht: `git push origin main`
- [ ] GitHub Actions erfolgreich: Grüner Haken ✅
- [ ] Firebase Console: Function sichtbar

### Nach dem Deployment:
- [ ] Login auf https://evang9.wien/combo/comboliederlisteFBpage
- [ ] Suche testen: "Halleluja"
- [ ] Console-Logs prüfen
- [ ] Performance prüfen (< 2 Sekunden)

---

## 🐛 TROUBLESHOOTING

### Problem: "unauthenticated" Error
**Lösung**: 
- Stelle sicher, dass du eingeloggt bist
- Prüfe Firebase Auth Token in DevTools > Application > Local Storage

### Problem: "permission-denied" Error
**Lösung**:
- Prüfe in Firestore: `accounts/{uid}` hat `roles: ["combolist"]`
- Füge Role hinzu falls fehlend

### Problem: Function nicht gefunden
**Lösung**:
```bash
# Functions neu deployen
firebase deploy --only functions

# Prüfen ob deployed
firebase functions:list
```

### Problem: Langsame Suche (> 5 Sekunden)
**Lösung**:
- Prüfe Anzahl der Lieder in Firestore
- Erwäge Algolia für > 500 Lieder
- Prüfe Firebase Region (sollte europe-west1 sein)

### Problem: Fallback wird immer verwendet
**Lösung**:
- Prüfe Functions Region: `getFunctions(app, 'europe-west1')`
- Prüfe Firebase Console Logs für Fehler
- Prüfe App Check Konfiguration

---

## 💰 KOSTEN-ÜBERSICHT

### Firebase Functions Pricing:
- **Invocations**: 2M/Monat KOSTENLOS
- **Compute Time**: 400.000 GB-s/Monat KOSTENLOS
- **Networking**: 5 GB/Monat KOSTENLOS

### Deine geschätzte Nutzung:
- 1000 Suchen/Monat
- ~0.5s pro Suche
- ~100 Lieder = ~10 KB Daten

**= Weit unter Free Tier! 🎉**

---

## 📈 NÄCHSTE SCHRITTE (Optional)

### Performance-Optimierung:
1. **Caching**: Suchergebnisse 5 Minuten cachen
2. **Indexing**: Firestore Composite Index für schnellere Queries
3. **Pagination**: Nur erste 50 Ergebnisse zurückgeben

### Feature-Erweiterungen:
1. **Fuzzy Search**: Typo-Toleranz mit Algolia
2. **Highlighting**: Suchbegriff im Snippet hervorheben
3. **Relevanz-Ranking**: Bessere Sortierung der Ergebnisse

---

## 📞 SUPPORT

Bei Problemen:
1. Prüfe Firebase Console Logs
2. Prüfe Browser Console
3. Prüfe GitHub Actions Logs
4. Kontaktiere Firebase Support (falls nötig)

**Viel Erfolg! 🚀**