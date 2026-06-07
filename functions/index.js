import { onCall, onRequest } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import cors from "cors";

admin.initializeApp();

// Initialize CORS middleware
const corsHandler = cors({
    origin: ["https://evang9.wien", "http://localhost:4321"],
    credentials: true,
});

/**
 * Search Function for Liedertexte
 * Performs server-side search in song lyrics to minimize client-side data transfer
 */
export const searchLieder = onRequest(
    {
        region: "europe-west1",
    },
    async (req, res) => {
        // Handle CORS
        return corsHandler(req, res, async () => {
            try {
                console.log("searchLieder called with:", req.body);

                // Get Firebase Auth token from header
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    res.status(401).json({ error: "Unauthorized - No token provided" });
                    return;
                }

                const idToken = authHeader.split('Bearer ')[1];

                // Verify the token
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                const uid = decodedToken.uid;

                const searchTerm = req.body.data?.searchTerm;

                // Validate search term
                if (!searchTerm || searchTerm.length < 2) {
                    res.status(400).json({ error: "Search term must be at least 2 characters" });
                    return;
                }

                // Check user role
                const accountRef = admin.firestore().doc(`accounts/${uid}`);
                const accountSnap = await accountRef.get();

                if (!accountSnap.exists) {
                    res.status(404).json({ error: "Account not found" });
                    return;
                }

                const accountData = accountSnap.data();
                const roles = accountData?.roles || [];

                if (!roles.includes("combolist")) {
                    console.warn(`Permission denied for UID ${uid}, roles=${roles}`);
                    res.status(403).json({ error: "Not allowed to search" });
                    return;
                }

                // Fetch all songs from Firestore
                const liederSnapshot = await admin.firestore()
                    .collection('lieder')
                    .get();

                // Server-side filtering
                const results = [];
                const searchLower = searchTerm.toLowerCase();

                liederSnapshot.forEach(doc => {
                    const data = doc.data();

                    // Search in Liedtext and Titel
                    const liedtext = (data.Liedtext || '').toLowerCase();
                    const titel = (data.Titel || '').toLowerCase();

                    if (liedtext.includes(searchLower) || titel.includes(searchLower)) {
                        results.push({
                            ID: doc.id,
                            Titel: data.Titel,
                            snippet: extractSnippet(data.Liedtext, searchTerm, 60)
                        });
                    }
                });

                console.log(`Found ${results.length} results for "${searchTerm}"`);

                res.status(200).json({
                    results,
                    count: results.length,
                    searchTerm: searchTerm
                });

            } catch (error) {
                console.error("Error in searchLieder:", error);
                res.status(500).json({ error: error.message || "Search failed" });
            }
        });
    }
);

/**
 * Helper function: Extract text snippet with search term
 */
function extractSnippet(text, searchTerm, contextLength = 60) {
    if (!text) return '';

    const lowerText = text.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();
    const index = lowerText.indexOf(lowerTerm);

    if (index === -1) return text.substring(0, 100) + '...';

    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + searchTerm.length + contextLength);

    let snippet = text.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    return snippet;
}

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