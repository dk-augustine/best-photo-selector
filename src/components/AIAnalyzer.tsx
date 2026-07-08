import React, { useState, useEffect } from "react";
import { 
  Sparkles, AlertCircle, Loader2, Award, CheckCircle, 
  ThumbsUp, ThumbsDown, HelpCircle, Star, Sparkle, Settings, Key, ShieldCheck, Globe
} from "lucide-react";
import { UploadedPhoto, AnalysisResult } from "../types";

interface AIAnalyzerProps {
  photos: UploadedPhoto[];
  onApplyAIRecommendations: (winnerId: string, discardIds: string[]) => void;
}

const LOADING_STEPS = [
  "Preparing photo payloads...",
  "Running facial region recognition...",
  "Analyzing eyes for blinks and squinting...",
  "Evaluating warmth and naturalness of smiles...",
  "Measuring pixel-level motion blur and focus...",
  "Aggregating aesthetic and quality scores...",
  "Formulating perfect choice summary..."
];

export default function AIAnalyzer({ photos, onApplyAIRecommendations }: AIAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetFocus, setTargetFocus] = useState("");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("best_photo_selector_gemini_key") || "");
  const [showSettings, setShowSettings] = useState(false);

  // Rotate loading step texts to keep user entertained and informed
  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingStepIdx(0);
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const saveApiKey = (key: string) => {
    const trimmed = key.trim();
    setApiKey(trimmed);
    if (trimmed) {
      localStorage.setItem("best_photo_selector_gemini_key", trimmed);
    } else {
      localStorage.removeItem("best_photo_selector_gemini_key");
    }
  };

  const runAIAnalysis = async () => {
    if (photos.length < 2) {
      setError("Please select at least 2 photos to run AI Smart Comparison.");
      return;
    }
    if (photos.length > 30) {
      setError("AI analysis supports up to 30 photos at once. Please de-select a few photos to proceed.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const isGitHubPages = window.location.hostname.endsWith("github.io") || window.location.pathname.includes("/best-photo-selector/");

    try {
      let data: AnalysisResult;
      
      // Determine if we should run client-side Gemini because a custom API key is present
      const configuredKey = apiKey.trim() || ((import.meta as any).env?.VITE_GEMINI_API_KEY || "").trim();

      if (configuredKey) {
        // Run direct client-side analysis using @google/genai SDK!
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: configuredKey });

        // Build contents parts
        const parts: any[] = [];
        photos.forEach((p, index) => {
          parts.push({
            inlineData: {
              mimeType: p.type,
              data: p.base64,
            },
          });
        });

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
          text: `Analyze and compare the uploaded photos (labeled Image_1 to Image_${photos.length}).
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
          model: "gemini-2.5-flash",
          contents: parts,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                best_image_id: {
                  type: "STRING",
                  description: "The ID of the best photo, e.g., Image_1, Image_2, etc.",
                },
                recommendation_summary: {
                  type: "STRING",
                  description: "Clear reasoning of why this photo was selected as the best and why others are less ideal.",
                },
                analyses: {
                  type: "ARRAY",
                  description: "Individual breakdown of each image's attributes.",
                  items: {
                    type: "OBJECT",
                    properties: {
                      id: {
                        type: "STRING",
                        description: "Must match Image_1, Image_2, etc.",
                      },
                      name: {
                        type: "STRING",
                        description: "The original file name.",
                      },
                      score: {
                        type: "INTEGER",
                        description: "Overall quality rating out of 10.",
                      },
                      sharpness: {
                        type: "STRING",
                        description: "e.g., 'Sharp', 'Slightly Blurry', 'Motion Blur', 'Soft Focus'.",
                      },
                      eyes_status: {
                        type: "STRING",
                        description: "e.g., 'Eyes fully open', 'Closed/Blinked', 'Squinting', 'N/A'.",
                      },
                      expression: {
                        type: "STRING",
                        description: "e.g., 'Natural Smile', 'Neutral', 'Awkward / Mid-word', 'N/A'.",
                      },
                      lighting_rating: {
                        type: "INTEGER",
                        description: "Score from 1 (poor) to 5 (excellent).",
                      },
                      composition_rating: {
                        type: "INTEGER",
                        description: "Score from 1 (poor) to 5 (excellent).",
                      },
                      pros: {
                        type: "ARRAY",
                        items: { type: "STRING" },
                        description: "Positive factors of this photo.",
                      },
                      cons: {
                        type: "ARRAY",
                        items: { type: "STRING" },
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
          throw new Error("No analysis returned from browser-side Gemini.");
        }
        data = JSON.parse(resultText);
      } else {
        // Run server-side API call
        const payloadImages = photos.map((p) => ({
          name: p.name,
          mimeType: p.type,
          base64: p.base64,
        }));

        const res = await fetch("/api/analyze-photos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            images: payloadImages,
            targetFocus: targetFocus.trim() 
          }),
        });

        if (!res.ok) {
          if (res.status === 404 || isGitHubPages) {
            throw new Error("It looks like this app is hosted as a static site (GitHub Pages) with no active backend. To run AI Smart Selector, click the ⚙️ settings icon on the right to configure your own Gemini API Key securely in your browser!");
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned error status ${res.status}`);
        }

        data = await res.json();
      }

      setResult(data);
    } catch (err: any) {
      console.error("AI Analysis failed:", err);
      if (isGitHubPages && !apiKey) {
        setError("GitHub Pages Warning: Since GitHub Pages hosts static files with no backend server, you must provide your own Gemini API Key to run the AI Selector. Please click the ⚙️ settings icon at the top right of this card to input your key!");
      } else {
        setError(err.message || "An error occurred while analyzing your photos. Please ensure your Gemini API Key is configured.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;

    // Find the winner photo from the list of compared photos by name/id
    // Wait, the result has "best_image_id" which is e.g. "Image_1" (which represents index 0 in the sent photos)
    const winnerIdx = parseInt(result.best_image_id.replace("Image_", ""), 10) - 1;
    if (isNaN(winnerIdx) || winnerIdx < 0 || winnerIdx >= photos.length) {
      console.error("Invalid winner index returned from AI");
      return;
    }

    const winnerPhoto = photos[winnerIdx];
    const winnerId = winnerPhoto.id;

    // Discard all other photos that were compared
    const discardIds = photos
      .filter((p) => p.id !== winnerId)
      .map((p) => p.id);

    onApplyAIRecommendations(winnerId, discardIds);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-800 text-base">
              AI Smart Recommendation ({photos.length} Photos)
            </h3>
            <p className="text-slate-400 text-xs">
              Let Gemini analyze expressions, eyes, blur, and lighting to pick the winner.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              showSettings 
                ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
            title="Configure Gemini API Settings (for GitHub Pages)"
          >
            <Settings className="w-4 h-4" />
          </button>

          {!loading && !result && (
            <button
              onClick={runAIAnalysis}
              disabled={photos.length < 2}
              className={`flex items-center gap-1.5 px-4 py-2 font-medium text-xs rounded-lg shadow-sm transition-all cursor-pointer ${
                photos.length >= 2
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white hover:shadow"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Analyze All {photos.length} Photos
            </button>
          )}
        </div>
      </div>

      {/* Settings Pane */}
      {showSettings && (
        <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-indigo-100 space-y-3 animate-fade-in">
          <div className="flex items-start gap-2">
            <Globe className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-slate-700">Dual-Mode Gemini API Configuration</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                By default, this app calls the backend proxy endpoint in full-stack environments. When deployed to <strong>GitHub Pages</strong> (static hosting), the backend is unavailable. You can enter your own Gemini API Key here to enable direct, client-side browser analysis!
              </p>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Key className="w-3 h-3 text-slate-400" /> Custom Gemini API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => saveApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
              />
              {apiKey && (
                <button
                  type="button"
                  onClick={() => saveApiKey("")}
                  className="px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-800 border border-rose-100 hover:bg-rose-50/50 rounded-lg transition-colors cursor-pointer"
                >
                  Clear Key
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50/50 border border-emerald-100 rounded-lg p-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Key is saved locally in your browser's <code>localStorage</code> and never shared.</span>
          </div>
        </div>
      )}

      {/* Target Face Focus Input */}
      {!loading && !result && (
        <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            👥 Prioritize Specific Face(s) (Optional)
          </label>
          <input
            type="text"
            value={targetFocus}
            onChange={(e) => setTargetFocus(e.target.value)}
            disabled={photos.length < 2}
            placeholder={
              photos.length < 2
                ? "Upload at least 2 photos to unlock AI evaluation"
                : "e.g. 'The baby in the center', 'The bride', 'The person on the far left wearing glasses'"
            }
            className={`w-full text-xs border rounded-lg px-3 py-2 transition-colors focus:outline-none focus:border-indigo-500 ${
              photos.length >= 2
                ? "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                : "bg-slate-100/60 border-slate-200 text-slate-400 placeholder:text-slate-400 cursor-not-allowed"
            }`}
          />
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Specify which subject's expression, eyes, or focus to prioritize. Perfect for big group photos, wedding shots, and portrait sessions where one subject's micro-expression is the make-or-break detail.
          </p>
        </div>
      )}

      {/* Upload constraints notice when no analysis running */}
      {!loading && !result && photos.length < 2 && (
        <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 text-center">
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            💡 <strong>AI comparison requires at least 2 photos.</strong> Please upload more photos to activate.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="relative mb-4">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <Sparkle className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-ping" />
          </div>
          <h4 className="text-sm font-semibold text-slate-700 animate-pulse">
            Analyzing Burst Sequence
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs font-mono h-4">
            {LOADING_STEPS[loadingStepIdx]}
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Analysis Failed</p>
            <p className="mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Results output */}
      {result && !loading && (
        <div className="space-y-6 animate-fade-in">
          {/* Winner recommendation box */}
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-5">
            <div className="flex gap-3 items-start">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  AI Recommended Winner
                </span>
                
                {/* Find winner filename */}
                {(() => {
                  const idx = parseInt(result.best_image_id.replace("Image_", ""), 10) - 1;
                  const winnerPhoto = photos[idx];
                  return (
                    <h4 className="font-display font-bold text-slate-800 text-sm mt-1.5 truncate">
                      🏆 {winnerPhoto ? winnerPhoto.name : result.best_image_id}
                    </h4>
                  );
                })()}

                <p className="text-slate-600 text-xs mt-2 leading-relaxed">
                  {result.recommendation_summary}
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleApply}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Apply AI Recommendations
                  </button>
                  <button
                    onClick={() => setResult(null)}
                    className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-xs rounded-lg transition-all"
                  >
                    Clear Results
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown scroll section */}
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Detailed Photo Scorecards
            </h4>
            
            {result.analyses.map((analysis) => {
              // Map the Image_X back to index
              const idx = parseInt(analysis.id.replace("Image_", ""), 10) - 1;
              const photoObj = photos[idx];
              if (!photoObj) return null;

              const isWinner = result.best_image_id === analysis.id;

              return (
                <div 
                  key={analysis.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isWinner 
                      ? "border-amber-400 bg-amber-50/10 shadow-sm" 
                      : "border-slate-100 bg-slate-50/30"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-2.5 items-center min-w-0">
                      <img 
                        src={photoObj.localUrl} 
                        alt={photoObj.name} 
                        className="w-10 h-10 object-cover rounded-md shrink-0 border border-slate-200"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {photoObj.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {analysis.id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 bg-slate-100 px-2 py-1 rounded-lg">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-slate-700 font-mono">
                        {analysis.score}/10
                      </span>
                    </div>
                  </div>

                  {/* Attributes Details List */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3.5 pt-3 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400">Sharpness:</span>{" "}
                      <span className="font-semibold text-slate-700">{analysis.sharpness}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Eyes:</span>{" "}
                      <span className="font-semibold text-slate-700">{analysis.eyes_status}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Expression:</span>{" "}
                      <span className="font-semibold text-slate-700">{analysis.expression}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Aesthetics:</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span 
                            key={i} 
                            className={`w-1.5 h-1.5 rounded-full ${
                              i < Math.round((analysis.lighting_rating + analysis.composition_rating) / 2)
                                ? "bg-indigo-500"
                                : "bg-slate-200"
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pros & Cons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 text-[10px]">
                    {analysis.pros.length > 0 && (
                      <div className="space-y-1">
                        <span className="font-semibold text-emerald-700 flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3 shrink-0" /> Pros
                        </span>
                        <ul className="list-disc pl-3 text-slate-600 space-y-0.5">
                          {analysis.pros.map((pro, i) => (
                            <li key={i}>{pro}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.cons.length > 0 && (
                      <div className="space-y-1">
                        <span className="font-semibold text-rose-700 flex items-center gap-1">
                          <ThumbsDown className="w-3 h-3 shrink-0" /> Cons
                        </span>
                        <ul className="list-disc pl-3 text-slate-600 space-y-0.5">
                          {analysis.cons.map((con, i) => (
                            <li key={i}>{con}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
