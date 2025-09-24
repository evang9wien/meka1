import admin from "firebase-admin";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
    readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function syncUsers() {
    try {
        const listUsersResult = await admin.auth().listUsers(1000); // max. 1000 auf einmal

        for (const userRecord of listUsersResult.users) {
            console.log("UID:", userRecord.uid, "Email:", userRecord.email);

            let userData = {
                email: userRecord.email,
                role: "", // wird ggf. überschrieben
                createdAt: new Date(),
            };

            const roles = ["combo", "predigt", "kirchenservice"];
            let found = false;

            // jede Rolle (combo, predigt, kirchenservice) durchsuchen
            for (const role of roles) {
                if (found) break; // abbrechen, wenn schon ein Treffer

                // Alle Subcollections unter mitarbeiter/<role> auflisten
                const subcols = await db.collection("mitarbeiter").doc(role).listCollections();

                for (const subcol of subcols) {
                    if (found) break;

                    const snap = await subcol
                        .where("Email", "==", userRecord.email)
                        .limit(1)
                        .get();

                    if (!snap.empty) {
                        const doc = snap.docs[0].data();

                        userData = {
                            ...userData,
                            role: role,
                            VName: doc.VName || null,
                            FName: doc.FName || null,
                            ShortName: doc.ShortName || null,
                            ID: doc.ID || null,
                        };

                        found = true;
                        break;
                    }
                }
            }

            // In Haupt-Collection accounts speichern
            await db.collection("accounts").doc(userRecord.uid).set(userData, { merge: true });
        }

        console.log("✅ Alle User synchronisiert");
    } catch (err) {
        console.error("❌ Fehler beim Auslesen:", err);
    }
}

syncUsers();
