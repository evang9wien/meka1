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
                role1: "", // wird ggf. überschrieben
                createdAt: new Date(),
            };

            const roles = ["combo", "predigt", "kirchenservice"];
            let found = false;

            // jede Rolle (combo, predigt, kirchenservice) durchsuchen
            for (const role of roles) {
                if (found) break; // abbrechen, wenn schon ein Treffer
                const roleDoc = await db.collection("mitarbeiter").doc(role).get();

                if (roleDoc.exists) {
                    const data = roleDoc.data();
                    // data ist ein Objekt mit allen Keys (= Attributnamen)
                    // console.log("Alle Keys im Dokument:", Object.keys(data));

                    for (const [key, value] of Object.entries(data)) {

                        // value ist hier wieder ein Objekt mit Email, VName, FName etc.
                        if (value.Email == userRecord.email) {
                            userData = {
                                ...userData,
                                role1: role,
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


                // // Alle Subcollections unter mitarbeiter/<role> auflisten
                // const subcols = await db.collection("mitarbeiter").doc(role).listCollections();
                // console.log(`🔍 Suche in Rolle: ${role}, Subcollections: ${subcols.map(c => c.id).join(", ")}`);
                // for (const subcol of subcols) {
                //     if (found) break;
                //     console.log(`🔍 Suche in ${role}/${subcol.id} nach ${userRecord.email}`);
                //     const snap = await subcol
                //         .where("Email", "==", userRecord.email)
                //         .limit(1)
                //         .get();

                //     if (!snap.empty) {
                //         const doc = snap.docs[0].data();

                //         userData = {
                //             ...userData,
                //             role: role,
                //             VName: doc.VName || null,
                //             FName: doc.FName || null,
                //             ShortName: doc.ShortName || null,
                //             ID: doc.ID || null,
                //         };

                //         found = true;
                //         break;
                //     }
                // }
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
