# 🔧 IAM Permission Fix für Firebase Functions Deployment

## ❌ Problem

GitHub Actions kann Functions nicht deployen:
```
Error: Missing permissions required for functions deploy. 
You must have permission iam.serviceAccounts.ActAs on service account 
evang9-combo-4cb8e@appspot.gserviceaccount.com
```

## ✅ Lösung: Service Account User Role hinzufügen

### Schritt 1: Google Cloud Console öffnen

Öffne diesen Link (du musst als Owner eingeloggt sein):
```
https://console.cloud.google.com/iam-admin/iam?project=evang9-combo-4cb8e
```

### Schritt 2: GitHub Actions Service Account finden

Suche nach dem Service Account:
```
github-action-XXXXXX@evang9-combo-4cb8e.iam.gserviceaccount.com
```

Oder suche nach:
```
Firebase Admin SDK Service Agent
```

### Schritt 3: Role hinzufügen

1. Klicke auf den **Bleistift** (Edit) neben dem Service Account
2. Klicke auf **"ADD ANOTHER ROLE"**
3. Suche nach: **"Service Account User"**
4. Wähle: **"Service Account User"** aus
5. Klicke auf **"SAVE"**

### Alternative: Via gcloud CLI

Falls du gcloud CLI installiert hast:

```bash
# 1. Finde den GitHub Actions Service Account
gcloud iam service-accounts list --project=evang9-combo-4cb8e

# 2. Füge die Role hinzu (ersetze EMAIL mit dem gefundenen Service Account)
gcloud projects add-iam-policy-binding evang9-combo-4cb8e \
  --member="serviceAccount:github-action-XXXXXX@evang9-combo-4cb8e.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

## 🔍 Welche Roles braucht der GitHub Actions Service Account?

### Minimal erforderlich:
- ✅ **Firebase Admin** (bereits vorhanden)
- ✅ **Cloud Functions Developer** (bereits vorhanden)
- ❌ **Service Account User** (FEHLT - muss hinzugefügt werden!)

### Nach dem Fix sollte der Service Account haben:
```
1. Firebase Admin
2. Cloud Functions Developer  
3. Service Account User  ← NEU
```

## 📋 Schritt-für-Schritt mit Screenshots

### 1. IAM Seite öffnen
![IAM Console](https://console.cloud.google.com/iam-admin/iam?project=evang9-combo-4cb8e)

### 2. Service Account finden
Suche nach: `github-action` oder `Firebase Admin SDK`

### 3. Edit klicken
Klicke auf das Bleistift-Symbol rechts

### 4. Role hinzufügen
- Klicke "ADD ANOTHER ROLE"
- Suche: "Service Account User"
- Wähle: "Service Account User"
- Speichern

## ✅ Testen

Nach dem Hinzufügen der Role:

```bash
# 1. Neuer Commit (z.B. README ändern)
echo "# Test" >> README.md
git add README.md
git commit -m "Test Functions deployment"
git push origin main

# 2. GitHub Actions beobachten
# https://github.com/[dein-repo]/actions

# 3. Sollte jetzt erfolgreich sein!
```

## 🎯 Warum ist diese Permission nötig?

**Service Account User** erlaubt:
- ✅ Functions als anderes Service Account ausführen
- ✅ Cloud Run Services deployen
- ✅ App Engine deployen

**Ohne diese Permission:**
- ❌ Functions Deployment schlägt fehl
- ❌ "iam.serviceAccounts.ActAs" Error

## 📞 Falls es nicht funktioniert

### Prüfe:
1. Bist du als **Owner** eingeloggt?
2. Hast du die richtige **Service Account** ausgewählt?
3. Hast du **"Service Account User"** (nicht "Service Account Admin") gewählt?
4. Hast du auf **"SAVE"** geklickt?

### Alternative Lösung:
Falls du keinen Owner-Zugriff hast, bitte den Projekt-Owner:
1. Gehe zu: https://console.cloud.google.com/iam-admin/iam?project=evang9-combo-4cb8e
2. Finde: `github-action-...@evang9-combo-4cb8e.iam.gserviceaccount.com`
3. Füge Role hinzu: "Service Account User"

## 🚀 Nach dem Fix

Sobald die Permission hinzugefügt ist:
- ✅ GitHub Actions kann Functions deployen
- ✅ Automatisches Deployment funktioniert
- ✅ Keine manuellen Deployments mehr nötig

**Viel Erfolg! 🎉**