import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel } from "firebase/ai";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBkfY3cReNsRC_jwL5jJVfwkEErZKYbUtg", // Using the key from firebase.js
    authDomain: "studio-2295864140-7e5fe.firebaseapp.com",
    projectId: "studio-2295864140-7e5fe",
    storageBucket: "studio-2295864140-7e5fe.firebasestorage.app",
    messagingSenderId: "605737443158",
    appId: "1:605737443158:web:b0f878c7f3e2749e6500f7"
};

async function test() {
    console.log("Testing Firebase AI (getAI) with Auth...");
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    console.log("Signing in anonymously...");
    await signInAnonymously(auth);
    console.log("Signed in:", auth.currentUser.uid);

    const ai = getAI(app);

    const modelsToTry = [
        "gemini-1.5-flash-8b",
        "gemini-2.0-flash"
    ];

    for (const modelName of modelsToTry) {
        console.log(`\nTesting model: ${modelName}...`);
        try {
            const model = getGenerativeModel(ai, { model: modelName });
            const result = await model.generateContent("Hello, are you working?");
            const response = result.response;
            console.log(`SUCCESS with ${modelName}:`, response.text());
            return; // Exit on first success
        } catch (error) {
            console.error(`FAILED with ${modelName}:`, error.message || JSON.stringify(error));
        }
    }
    console.log("\nAll models failed.");
}

test();

