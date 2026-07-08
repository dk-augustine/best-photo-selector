import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini client safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Please add it to Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

async function bootstrap() {
  const app = express();
  const PORT = 3000;

  // Set body parser limits to handle large images (e.g. multiple camera photos in base64)
  app.use(express.json({ limit: "60mb" }));
  app.use(express.urlencoded({ limit: "60mb", extended: true }));

  // API Endpoint for photo analysis
  app.post("/api/analyze-photos", async (req, res) => {
    try {
      const { images, targetFocus } = req.body; // Array of images, optional targetFocus text
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "No images provided for analysis." });
      }

      if (images.length > 30) {
        return res.status(400).json({ error: "Please upload a maximum of 30 images at once for AI analysis to avoid exceeding model processing token bounds." });
      }

      const ai = getGeminiClient();

      // Construct multi-modal parts
      const parts: any[] = [];
      
      images.forEach((img, idx) => {
        const id = `Image_${idx + 1}`;
        parts.push({
          text: `This is ${id}. Filename: "${img.name}".`
        });
        parts.push({
          inlineData: {
            mimeType: img.mimeType || "image/jpeg",
            data: img.base64, // Base64 string without data:image/jpeg;base64, prefix
          }
        });
      });

      // Tailor focus based on user specifications
      let targetFocusInstruction = "";
      if (targetFocus && targetFocus.trim() !== "") {
        targetFocusInstruction = `
CRITICAL DIRECTIVE: The user has set the facial priority focus to evaluate: "${targetFocus}".
Please identify the person/face fitting this description in each of the uploaded images. Your scoring and final selection MUST prioritize the eyes status, facial expression, and sharpness of this specific person above all others in the group. If other background or group members blink or look away, it is fully acceptable as long as this prioritized person looks their absolute best. Please state explicitly in your recommendation summary how this target person looks in the winning photo.`;
      } else {
        targetFocusInstruction = `
Evaluate all human faces present in the group. If there are multiple faces, balance their scores, aiming for a shot where the maximum number of people are looking at the camera, have open eyes, and look natural.`;
      }

      parts.push({
        text: `Analyze and compare the uploaded photos (labeled Image_1 to Image_${images.length}).
These are highly similar/duplicate photos or burst shots of the same group or event. Evaluate them to select the single BEST photo.

${targetFocusInstruction}

In your analysis, pay extremely close attention to:
1. Sharpness & focus (detect blur, camera shake, or soft focus).
2. Eyes status (fully open eyes vs blinking, squinting, or closed).
3. Facial expression (natural and warm smiles, direct eye contact with camera, avoid awkward mid-speech frames, chewing, or yawning).
4. General lighting, composition, and details.

Return a detailed JSON response identifying the 'best_image_id' (Image_1, Image_2, etc.), a 'recommendation_summary' explaining why that photo is superior, and an array of individual 'analyses' for each image detailing its score (1-10), sharpness, eyes_status, expression, lighting_rating (1-5), composition_rating (1-5), pros, and cons.`
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: parts,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              best_image_id: {
                type: Type.STRING,
                description: "The ID of the best photo, e.g., Image_1, Image_2, etc.",
              },
              recommendation_summary: {
                type: Type.STRING,
                description: "Clear reasoning of why this photo was selected as the best and why others are less ideal.",
              },
              analyses: {
                type: Type.ARRAY,
                description: "Individual breakdown of each image's attributes.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: {
                      type: Type.STRING,
                      description: "Must match Image_1, Image_2, etc.",
                    },
                    name: {
                      type: Type.STRING,
                      description: "The original file name.",
                    },
                    score: {
                      type: Type.INTEGER,
                      description: "Overall quality rating out of 10.",
                    },
                    sharpness: {
                      type: Type.STRING,
                      description: "e.g., 'Sharp', 'Slightly Blurry', 'Motion Blur', 'Soft Focus'.",
                    },
                    eyes_status: {
                      type: Type.STRING,
                      description: "e.g., 'Eyes fully open', 'Closed/Blinked', 'Squinting', 'N/A'.",
                    },
                    expression: {
                      type: Type.STRING,
                      description: "e.g., 'Natural Smile', 'Neutral', 'Awkward / Mid-word', 'N/A'.",
                    },
                    lighting_rating: {
                      type: Type.INTEGER,
                      description: "Score from 1 (poor) to 5 (excellent).",
                    },
                    composition_rating: {
                      type: Type.INTEGER,
                      description: "Score from 1 (poor) to 5 (excellent).",
                    },
                    pros: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Positive factors of this photo.",
                    },
                    cons: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Negative factors or drawbacks.",
                    },
                  },
                  required: ["id", "name", "score", "sharpness", "eyes_status", "expression", "lighting_rating", "composition_rating", "pros", "cons"],
                },
              },
            },
            required: ["best_image_id", "recommendation_summary", "analyses"],
          },
        },
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No analysis returned from Gemini.");
      }

      const data = JSON.parse(resultText);
      res.json(data);
    } catch (error: any) {
      console.error("Gemini Photo Analysis Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during photo analysis." });
    }
  });

  // Serve frontend with Vite middleware or production static folder
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
});
