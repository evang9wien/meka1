# 🔧 IAM Permission Fix für Firebase Functions & Rules Deployment

Dieses Dokument beschreibt die notwendigen IAM-Berechtigungen für den GitHub Actions Service Account, um Cloud Functions, Cloud Firestore Rules und Realtime Database Rules automatisiert deployen zu können.

---

## ❌ Probleme & Fehlermeldungen

### 1. Cloud Functions Deployment schlägt fehl
```
Error: Missing permissions required for functions deploy. 
You must have permission iam.serviceAccounts.ActAs on service account 
evang9-combo-4cb8e@appspot.gserviceaccount.com
```

### 2. Realtime Database & Firestore Rules Deployment schlägt fehl
```
i  database: checking rules syntax...
Error: Failed to get instance details for instance: evang9-combo-4cb8e-default-rtdb. See firebase-debug.log for more details.
```

---

## ✅ Lösung: Rollen in der Google Cloud Console hinzufügen

### Schritt 1: Google Cloud Console öffnen
Öffne die IAM-Steuerung (du musst mit einem Account mit **Owner**-Rechten eingeloggt sein):
[Google Cloud Console IAM - evang9-combo](https://console.cloud.google.com/iam-admin/iam?project=evang9-combo-4cb8e)

### Schritt 2: GitHub Actions Service Account finden
Suche in der Liste nach dem Service Account für GitHub Actions:
```
github-action-724169839@evang9-combo-4cb8e.iam.gserviceaccount.com
```

### Schritt 3: Rollen hinzufügen
1. Klicke ganz rechts in der Zeile auf das **Bleistift-Symbol** (Mitglied bearbeiten).
2. Klicke für jede fehlende Rolle auf **"ADD ANOTHER ROLE"** (Weitere Rolle hinzufügen).
3. Weise dem Service Account die folgenden Rollen zu:
   * 👤 **Service Account User** *(ermöglicht Functions-Deployments)*
   * 🗄️ **Firebase Realtime Database-Administrator** *(für Realtime Database-Regeln)*
   * 🛡️ **Firebase Rules-Administrator** *(für Cloud Firestore-Sicherheitsregeln)*
4. Klicke auf **"SAVE"** (Speichern).

---

## 🔍 Welche Rollen muss der GitHub Actions Service Account haben?

Nach dem vollständigen Setup sollte der Service Account im IAM-Bereich die folgenden Rollen besitzen:

1. **API Keys Viewer**
2. **Cloud Functions Admin**
3. **Cloud Functions Developer**
4. **Cloud Run Viewer**
5. **Firebase Authentication Admin**
6. **Firebase Hosting Admin**
7. **Service Usage Consumer**
8. **Service Account User** *(Neu für Functions)*
9. **Firebase Realtime Database-Administrator** *(Neu für RTDB-Regeln)*
10. **Firebase Rules-Administrator** *(Neu für Firestore-Regeln)*

---

## 🚀 Testen & Deployment
Nach dem Speichern der Rollen (dies kann bis zu 2 Minuten dauern) kannst du den GitHub Actions-Lauf neu starten. Das automatisierte Deployment wird nun sowohl die Webseite, die Cloud-Funktionen als auch alle Sicherheitsregeln reibungslos deployen.