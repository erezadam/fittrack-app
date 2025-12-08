import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyAnXaE-aRyseptFxNw_2Sn6rxjpuDgksxQ";

async function test() {
    console.log("Testing API Key:", API_KEY);
    const genAI = new GoogleGenerativeAI(API_KEY);
    try {
        // Note: listModels is on the genAI instance or model manager?
        // Actually, the SDK doesn't expose listModels directly on the client easily in all versions.
        // Let's try a known stable model like 'gemini-pro' or 'gemini-1.5-flash-001' to see if it works.

        console.log("Trying gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-1.5-flash:", result.response.text());

    } catch (error) {
        console.error("Error with gemini-1.5-flash:", error.message);

        try {
            console.log("Trying gemini-pro...");
            const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result2 = await model2.generateContent("Hello");
            console.log("Success with gemini-pro:", result2.response.text());
        } catch (e2) {
            console.error("Error with gemini-pro:", e2.message);
        }
    }
}

test();
