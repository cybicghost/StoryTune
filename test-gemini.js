const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function test() {
  try {
    console.log("Testing Gemini image analysis...");

    const image = fs.readFileSync("test.jpg");
    const base64 = image.toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64,
          },
        },
        {
          text: "Describe this image in one sentence.",
        },
      ],
    });

    console.log("IMAGE TEST SUCCESS:", response.text);

  } catch (error) {
    console.error("IMAGE TEST FAILED:", error);
  }
}

test();