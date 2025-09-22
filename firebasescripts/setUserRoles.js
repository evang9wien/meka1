import admin from "firebase-admin";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
    readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Alle User holen und verarbeiten
async function syncUsers() {
    try {
        const listUsersResult = await admin.auth().listUsers(1000); // max. 1000 auf einmal
        listUsersResult.users.forEach(async (userRecord) => {
            console.log("UID:", userRecord.uid, "Email:", userRecord.email);

            // Beispiel 1: Rolle setzen per Custom Claim
            // await admin.auth().setCustomUserClaims(userRecord.uid, { role: "musiker" });

            // Beispiel 2: In Firestore speichern
            const db = admin.firestore();
            await db.collection("accounts").doc(userRecord.uid).set({
                email: userRecord.email,
                role: "musiker", // Default Rolle
                createdAt: new Date(),
            }, { merge: true });
        });
        console.log("✅ Alle User synchronisiert");
    } catch (err) {
        console.error("❌ Fehler beim Auslesen:", err);
    }
}

syncUsers();
