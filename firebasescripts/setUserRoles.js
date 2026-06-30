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
                createdAt: new Date(),
            };

            const mitarbeiterRoles = ["combo", "predigt", "kirchenservice"];
            let found = false;

            // jede Rolle (combo, predigt, kirchenservice) durchsuchen
            for (const role of mitarbeiterRoles) {
                if (found) break;
                const roleDoc = await db.collection("mitarbeiter").doc(role).get();

                if (roleDoc.exists) {
                    const data = roleDoc.data();

                    for (const [key, value] of Object.entries(data)) {
                        if (value.Email == userRecord.email) {
                            userData = {
                                ...userData,
                                VName: value.VName || null,
                                FName: value.FName || null,
                                ShortName: value.ShortName || null,
                                ID: value.ID || null,
                            };
                            console.log(`👤 ${key} ->`, value);
                            found = true;
                            break;
                        }
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
