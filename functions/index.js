import { onCall } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";

admin.initializeApp();

export const getAudioUrl = onCall(
    {
        enforceAppCheck: true, // Reject requests with missing or invalid App Check tokens.
    },
    async (request) => {
        console.log("Function getAudioUrl called with data:", request.data);
        console.log("Function getAudioUrl called with auth:", request.auth);

        if (!request.auth) {
            console.error("Unauthenticated request.");
            throw new HttpsError("unauthenticated", "Login required");
        }

        const uid = request.auth.uid;
        console.log("Authenticated user UID:", uid);

        try {
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

            const fileName = request.data.fileName;
            const pdfPath = `lieder/noten/${fileName}.pdf`;
            const mp3Path = `lieder/mp3/${fileName}.mp3`;

            const bucket = getStorage().bucket();

            const pdfFile = bucket.file(pdfPath);
            const mp3File = bucket.file(mp3Path);

            const expires = Date.now() + 5 * 60 * 1000;

            const result = {};

            // PDF prüfen und ggf. URL generieren
            const [pdfExists] = await pdfFile.exists();
            if (pdfExists) {
                const [pdfUrl] = await pdfFile.getSignedUrl({ action: "read", expires });
                result.pdfUrl = pdfUrl;
            }
            // else {
            //     console.warn(`PDF file not found: ${pdfPath}`);
            // }

            // MP3 prüfen und ggf. URL generieren
            const [mp3Exists] = await mp3File.exists();
            if (mp3Exists) {
                const [mp3Url] = await mp3File.getSignedUrl({ action: "read", expires });
                result.mp3Url = mp3Url;
            }
            // else {
            //     console.warn(`MP3 file not found: ${mp3Path}`);
            // }

            return result;
        } catch (error) {
            console.error("Error in getAudioUrl:", error);
            throw new HttpsError("internal", error.message || "Unknown error");
        }
    });