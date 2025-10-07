import { onCall } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";

admin.initializeApp();

export const getAudioUrl = onCall(async (request) => {
    console.log("Function getAudioUrl called with data:", request.data);
    console.log("Function getAudioUrl called with auth:", request.auth);

    // Auth check
    if (!request.auth) {
        console.error("Unauthenticated request.");
        throw new HttpsError("unauthenticated", "Login required");
    }

    const uid = request.auth.uid;
    console.log("Authenticated user UID:", uid);

    try {
        // Firestore role check
        const accountRef = admin.firestore().doc(`accounts/${uid}`);
        const accountSnap = await accountRef.get();

        if (!accountSnap.exists) {
            console.error(`No account document found for UID: ${uid}`);
            throw new HttpsError("not-found", "Account not found");
        }

        const accountData = accountSnap.data();
        const role = accountData?.role1;
        console.log(`User role for UID ${uid}:`, role);

        if (role !== "combo") {
            console.warn(`Permission denied for UID ${uid}, role=${role}`);
            throw new HttpsError("permission-denied", "Not allowed");
        }

        // File access
        const filePath = `lieder/noten/${request.data.fileName}.pdf`;
        console.log("Requested file path:", filePath);

        const bucket = getStorage().bucket();
        const file = bucket.file(filePath);

        // Prüfen, ob die Datei existiert
        const [exists] = await file.exists();
        if (!exists) {
            console.error(`File does not exist: ${filePath}`);
            throw new HttpsError("not-found", "Requested file not found");
        }

        // URL expiry 5 min
        const expires = Date.now() + 5 * 60 * 1000;

        console.log("Generating signed URL...");
        const [url] = await file.getSignedUrl({ action: "read", expires });

        console.log("Signed URL successfully generated:", url);

        return { url };
    } catch (error) {
        console.error("Error in getAudioUrl:", error);
        throw new HttpsError("internal", error.message || "Unknown error");
    }
});