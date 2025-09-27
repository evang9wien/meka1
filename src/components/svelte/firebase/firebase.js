// src/components/svelte/firebase/firebase.js
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const secret = import.meta.env.PUBLIC_FIREBASE_API_KEY;
const myDevMode = import.meta.env.PUBLIC_MY_DEV_MODE;
console.log("Secret:", secret);
console.log("DevMode:", myDevMode);

const firebaseConfig = {
  apiKey: 'AIzaSyCCScuVEd_E1vQRPMkCuALcccPbly0JhPc',
  authDomain: 'evang9-combo-4cb8e.firebaseapp.com',
  databaseURL: 'https://evang9-combo-4cb8e-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'evang9-combo-4cb8e',
  storageBucket: 'evang9-combo-4cb8e.appspot.com',
  messagingSenderId: '110813316877',
  appId: '1:110813316877:web:2e6a8789144bb3e5189244',
  measurementId: 'G-RC23VERNJ8',
};

export { firebaseConfig };

const firebaseApp = initializeApp(firebaseConfig);

// AppCheck nicht sofort initialisieren, sondern als Funktion exportieren
export function initAppCheck() {
  if (typeof window === "undefined") {
    // Läuft im SSR → abbrechen
    return null;
  }

  if (myDevMode) {
    // Lokale Entwicklung: Debug Provider
    // Muss im Browser gesetzt werden
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    console.log("AppCheck im Debug-Modus");
  }

  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider("6LfUBc8rAAAAABuA5imvRrJ7ofxm6Y9J1wd1bcDv"),
    isTokenAutoRefreshEnabled: true
  });
  return firebaseApp;
}

export { firebaseApp };