
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Models are tried in this order.
const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
];


const PROMPT = `
You are Storytune, an expert AI music curator and visual aesthetic analyst.

Analyze the uploaded photograph and translate its atmosphere into musical directions.

Consider:
- Colours, lighting, and atmosphere.
- Environment and surroundings.
- Visible emotions and expressions.
- Overall aesthetic and energy.
- Music that naturally complements the photograph.

Return:
1. A dominant emotional mood in 1-3 words.
2. Exactly 4 music genres or subgenres.
3. Exactly 4 musical moods.
4. Exactly 4 listening styles.
5. One short description connecting the photo to its musical potential.

GENRES: Use actual genres such as Dream Pop, Indie Folk, R&B, Alternative Rock, Afrobeats, Indie Pop, Lo-fi Hip-hop, Jazz, Soul, Synthwave, Acoustic Pop or Electronic.

MUSICAL MOODS: Use terms such as Melancholic, Euphoric, Dreamy, Romantic, Nostalgic, Mysterious, Uplifting, Atmospheric, Peaceful or Intense.

LISTENING STYLES: Use experiences such as Late-night drive, Sunset playlist, Soft vocals, Slow dancing, Rainy-day listening, Cinematic soundtrack or Midnight playlist.

IMPORTANT:
- Every suggestion must fit the actual photograph.
- Prioritize musical relevance over visual descriptions.
- Never force a genre that does not fit.
- Avoid generic visual tags.
- Do not recommend songs or artists.
- Keep every tag short.

Return ONLY valid JSON in this exact structure:

{
  "mood": "Warm and nostalgic",
  "genres": [
    "Dream Pop",
    "Indie Folk",
    "Chill R&B",
    "Acoustic Soul"
  ],
  "musicalMoods": [
    "Dreamy",
    "Romantic",
    "Nostalgic",
    "Melancholic"
  ],
  "listeningStyles": [
    "Sunset playlist",
    "Soft vocals",
    "Slow evening",
    "Cinematic soundtrack"
  ],
  "description": "A warm, nostalgic atmosphere that pairs beautifully with dreamy melodies and mellow vocals."
}

Return exactly 4 items in each category. Return valid JSON only.
`;


const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function askGemini(mimeType: string, base64: string) {
  let lastError: unknown;

  for (const model of MODELS) {
    console.log(`Trying Gemini model: ${model}`);

    // Try each model up to 3 times.
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            { inlineData: { mimeType, data: base64 } },
            { text: PROMPT },
          ],
          config: {
            responseMimeType: "application/json",
          },
        });

        console.log(`Successfully analyzed image using ${model}`);

        const result = JSON.parse(response.text ?? "{}");

const genres = Array.isArray(result.genres)
  ? result.genres.slice(0, 4)
  : [];

const musicalMoods = Array.isArray(result.musicalMoods)
  ? result.musicalMoods.slice(0, 4)
  : [];

const listeningStyles = Array.isArray(result.listeningStyles)
  ? result.listeningStyles.slice(0, 4)
  : [];

return {
  mood: result.mood || "Unknown mood",
  description: result.description || "No description available.",
  genres,
  musicalMoods,
  listeningStyles,

  // Keep the existing recommendation API compatible.
  tags: [...genres, ...musicalMoods, ...listeningStyles],
};
      } catch (error) {
        lastError = error;

        const status = Number(
          (error as { status?: number })?.status
        );

        console.error(
          `Gemini error with ${model}, attempt ${attempt}:`,
          error
        );

        // Retry only temporary server or rate-limit errors.
        if (status !== 503 && status !== 429) {
          throw error;
        }

        // Exponential backoff: 1.5s, then 3s.
        if (attempt < 3) {
          const delay = 1500 * Math.pow(2, attempt - 1);

          console.log(`Waiting ${delay}ms before retrying...`);

          await sleep(delay);
        }
      }
    }

    console.log(`${model} failed. Moving to the next model...`);
  }

  throw lastError ?? new Error("All Gemini models failed.");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image received" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const data = await askGemini(
      file.type,
      buffer.toString("base64")
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Image analysis failed:", error);

    return NextResponse.json(
      {
        error:
          "The AI is busy right now. Please try again in a minute.",
      },
      { status: 503 }
    );
  }
}
