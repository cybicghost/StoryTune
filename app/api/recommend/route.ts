import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY;

const MODELS = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];

type RecommendInput = {
  mood: string;
  tags: string[];
  description: string;
  genre?: string;
  language?: string;
  theme?: string;
};

type RecommendedSong = {
  title: string;
  artist: string;
  language: string;
  vibe: string;
  reason: string;
  lyricalMeaning: string[];
};

async function findAlbumArtwork(title: string, artist: string) {
  try {
    const searchTerm = title + " " + artist;
const query = encodeURIComponent(searchTerm);

    const response = await fetch(
  "https://itunes.apple.com/search?term=" +
    query +
    "&entity=song&limit=5",
  { signal: AbortSignal.timeout(5000) }
);

    if (!response.ok) {
      return { album: "", albumCoverUrl: null, previewUrl: null };
    }

    const data = await response.json();

    if (!Array.isArray(data.results) || data.results.length === 0) {
      return { album: "", albumCoverUrl: null, previewUrl: null };
    }

    const normalize = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, "");

    const wantedTitle = normalize(title);
    const wantedArtist = normalize(artist);

    const match = data.results.find((result: Record<string, unknown>) => {
      if (
        typeof result.trackName !== "string" ||
        typeof result.artistName !== "string"
      ) {
        return false;
      }

      const foundTitle = normalize(result.trackName);
      const foundArtist = normalize(result.artistName);

      return (
        (foundTitle === wantedTitle ||
          foundTitle.includes(wantedTitle) ||
          wantedTitle.includes(foundTitle)) &&
        (foundArtist.includes(wantedArtist) ||
          wantedArtist.includes(foundArtist))
      );
    });

    const result = match ?? data.results[0];

    return {
      album:
        typeof result.collectionName === "string"
          ? result.collectionName
          : "",
      albumCoverUrl:
        typeof result.artworkUrl100 === "string"
          ? result.artworkUrl100.replace("100x100bb", "600x600bb")
          : null,
      previewUrl:
        typeof result.previewUrl === "string" ? result.previewUrl : null,
    };
  } catch (error) {
    console.error("Album artwork lookup failed:", error);

    return { album: "", albumCoverUrl: null, previewUrl: null };
  }
}

function buildPrompt(input: RecommendInput) {
  return `
You are Storytune, an expert AI music curator with a deep
understanding of music, visual aesthetics, emotions, and culture.

Your job is to create a soundtrack that feels naturally connected
to the user's photograph.

PHOTO ANALYSIS:
Mood: ${input.mood}
Visual tags: ${input.tags.join(", ")}
Description: ${input.description}

YOUR TASK:
Analyze the photo's visual atmosphere and independently determine
the most suitable musical direction.

Consider:
- Colours, including neon, blue, purple, red, gold, and pastel.
- Lighting, including sunlight, sunset, shadows, and neon lights.
- Environment, including cities, roads, bedrooms, beaches, and nature.
- Emotional atmosphere, including romance, loneliness, confidence,
  nostalgia, mystery, peace, and excitement.
- Visual aesthetics, including cinematic, dreamy, vintage,
  futuristic, minimal, and dark.
- Energy level, from calm and atmospheric to intense and energetic.

IMPORTANT:
Do not ask the user for genre, language, or lyrical preferences.
Choose the best-fitting music automatically.

Examples of musical interpretation:
- Neon city at night: dark electronic, synthwave, atmospheric R&B.
- Night drive: melodic rap, atmospheric pop, synthwave.
- Golden-hour photography: indie pop, acoustic, warm romantic music.
- Dreamy pastel scenery: dream pop, ethereal music, soft indie.
- Dark, dramatic photography: dark R&B, alternative, moody hip-hop.
- Sunny beach photography: tropical house, chill pop, summer music.

These are examples, not fixed rules. Interpret the complete photo
rather than matching one colour to one genre.

SONG SELECTION:
1. Recommend 10 real, existing songs that fit the photo.
2. Return at least 8 valid recommendations.
3. Select songs from suitable languages automatically.
4. Include a sensible variety of songs that share the photo's
   atmosphere without making every recommendation sound identical.
5. Prefer accurate song titles and artist names.
6. Avoid duplicate songs and duplicate versions of the same song.
7. Do not invent songs, artists, or factual claims.
8. Explain why each song fits this particular photograph.
9. Give each song a short vibe label, such as "Neon Nights",
   "Late Night Drive", "Dreamy Escape", or "Golden Hour".
10. Provide exactly two short lines describing the song's lyrical
    meaning and emotional connection.
11. Do not quote or reproduce copyrighted song lyrics.
12. Return valid JSON only, without Markdown or extra commentary.

Use this exact JSON structure:

{
  "songs": [
    {
      "title": "Exact song title",
      "artist": "Artist name",
      "language": "Song language",
      "vibe": "Short descriptive vibe label",
      "reason": "Why this song matches the photograph",
      "lyricalMeaning": [
        "First short explanation of the lyrical meaning.",
        "Second short explanation of its emotional connection."
      ]
    }
  ]
}
`;
}


async function askGemini(
  input: RecommendInput
): Promise<RecommendedSong[]> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 30000,
      retryOptions: {
        attempts: 1,
      },
    },
  });

  const prompt = buildPrompt(input);
  let lastError: unknown;

  for (const model of MODELS) {
    console.log(`Trying recommendation model: ${model}`);

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed: unknown = JSON.parse(response.text ?? "{}");

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("songs" in parsed) ||
        !Array.isArray(parsed.songs)
      ) {
        throw new Error("The AI returned an invalid song list.");
      }

      const songs: RecommendedSong[] = parsed.songs.map(
        (song: unknown) => {
          if (typeof song !== "object" || song === null) {
            throw new Error("Invalid song data.");
          }

          const item = song as Record<string, unknown>;

          if (
            typeof item.title !== "string" ||
            typeof item.artist !== "string" ||
            typeof item.language !== "string" ||
            typeof item.vibe !== "string" ||
            typeof item.reason !== "string" ||
            !Array.isArray(item.lyricalMeaning) ||
            item.lyricalMeaning.length !== 2 ||
            !item.lyricalMeaning.every(
              (line) => typeof line === "string"
            )
          ) {
            throw new Error("A song has missing or invalid fields.");
          }

          return {
            title: item.title,
            artist: item.artist,
            language: item.language,
            vibe: item.vibe,
            reason: item.reason,
            lyricalMeaning: item.lyricalMeaning as string[],
          };
        }
      );

      if (songs.length < 8) {
        throw new Error("The AI returned fewer than 8 valid songs.");
      }

      console.log(`Successfully generated songs using ${model}`);

      return songs.slice(0, 10);
    } catch (error) {
      lastError = error;

      const status = Number(
        (error as { status?: number })?.status
      );

      console.error(`Model ${model} failed:`, error);

      // Move to the next model for temporary availability errors.
      if (status === 503 || status === 429) {
        console.log(`Switching to fallback model...`);
        continue;
      }

      // Don't hide invalid JSON or other unexpected errors.
      throw error;
    }
  }

  throw lastError ?? new Error("All Gemini models failed.");
}


export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Invalid request data." },
        { status: 400 }
      );
    }

    const input = body as Partial<RecommendInput>;

    if (
      typeof input.mood !== "string" ||
      !Array.isArray(input.tags) ||
      !input.tags.every((tag) => typeof tag === "string") ||
      typeof input.description !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid photo vibe data." },
        { status: 400 }
      );
    }

    const songs = await askGemini({
      mood: input.mood,
      tags: input.tags,
      description: input.description,
      genre: input.genre,
      language: input.language,
      theme: input.theme,
    });


const songsWithLinks = await Promise.all(
  songs.map(async (song) => {
    const artwork = await findAlbumArtwork(song.title, song.artist);

    return {
      ...song,
      ...artwork,
      youtubeUrl:
        "https://www.youtube.com/results?search_query=" +
        encodeURIComponent(
          song.title + " " + song.artist + " official song"
        ),
    };
  })
);

    return NextResponse.json({ songs: songsWithLinks });
  } catch (error) {
    console.error("Recommendation API error:", error);

    return NextResponse.json(
      {
        error:
          "We couldn't generate recommendations right now. Please try again.",
      },
      {
  status:
    Number((error as { status?: number })?.status) === 503 ||
    Number((error as { status?: number })?.status) === 429
      ? 503
      : 500,
}
    );
  }
}