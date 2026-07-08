import React, { useState, useMemo } from "react";
import { 
  Camera, Trash2, ArrowRight, Download, CheckCircle, 
  XCircle, Clipboard, RefreshCw, AlertCircle, Sparkles
} from "lucide-react";
import { UploadedPhoto } from "./types";
import UploadZone from "./components/UploadZone";
import ImageGrid from "./components/ImageGrid";
import ComparisonViewer from "./components/ComparisonViewer";
import AIAnalyzer from "./components/AIAnalyzer";
import PrivacyBanner from "./components/PrivacyBanner";

export default function App() {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [sidebarFilter, setSidebarFilter] = useState<"all" | "keep" | "discard" | "undecided">("all");
  const [showDeleteHelp, setShowDeleteHelp] = useState(false);
  const [copiedList, setCopiedList] = useState(false);

  // Handle uploaded photos from the dropzone
  const handlePhotosUploaded = (newPhotos: UploadedPhoto[]) => {
    setPhotos((prev) => {
      const updated = [...prev, ...newPhotos];
      // Auto-select the first 2 photos of the new set for comparison if none are selected
      if (selectedPhotoIds.length === 0) {
        setSelectedPhotoIds(updated.slice(0, 2).map((p) => p.id));
      }
      return updated;
    });
  };

  // Toggle photo comparison selection
  const handleToggleSelect = (id: string) => {
    setSelectedPhotoIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        // Allow selecting up to 30 photos to compare
        if (prev.length >= 30) {
          return [...prev.slice(1), id];
        }
        return [...prev, id];
      }
    });
  };

  // Select all uploaded photos (up to the limit of 30)
  const handleSelectAll = () => {
    setSelectedPhotoIds(photos.slice(0, 30).map((p) => p.id));
  };

  // Clear selection
  const handleDeselectAll = () => {
    setSelectedPhotoIds([]);
  };

  // Set individual photo status (Keep / Discard / Undecided)
  const handleSetStatus = (id: string, status: "keep" | "discard" | "undecided") => {
    setPhotos((prev) =>
      prev.map((photo) => (photo.id === id ? { ...photo, status } : photo))
    );
  };

  // Apply AI Smart recommendations
  const handleApplyAIRecommendations = (winnerId: string, discardIds: string[]) => {
    setPhotos((prev) =>
      prev.map((photo) => {
        if (photo.id === winnerId) {
          return { ...photo, status: "keep" };
        }
        if (discardIds.includes(photo.id)) {
          return { ...photo, status: "discard" };
        }
        return photo;
      })
    );
    // Focus comparison selection on the winner to celebrate!
    setSelectedPhotoIds([winnerId]);
  };

  // Remove photo from the workspace entirely
  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
    setSelectedPhotoIds((prev) => prev.filter((item) => item !== id));
  };

  // Clear workspace
  const handleClearAll = () => {
    // Revoke object URLs to avoid memory leaks
    photos.forEach((p) => URL.revokeObjectURL(p.localUrl));
    setPhotos([]);
    setSelectedPhotoIds([]);
    setSidebarFilter("all");
    setShowDeleteHelp(false);
  };

  // Filter photos currently selected for comparison
  const comparedPhotos = useMemo(() => {
    return photos.filter((p) => selectedPhotoIds.includes(p.id));
  }, [photos, selectedPhotoIds]);

  // Tallies for keeping, discarding, undecided
  const tallies = useMemo(() => {
    return photos.reduce(
      (acc, photo) => {
        acc[photo.status]++;
        return acc;
      },
      { keep: 0, discard: 0, undecided: 0 }
    );
  }, [photos]);

  // Programmatic batch downloader for Keepers
  const downloadKeepers = () => {
    const keepers = photos.filter((p) => p.status === "keep");
    if (keepers.length === 0) return;

    keepers.forEach((p, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = p.localUrl;
        link.download = `keeper_${p.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 300); // Stagger download clicks to prevent Safari or Chrome blocking multiple files
    });
  };

  // Generate a comma-separated list of filenames marked to delete
  const discardFileListText = useMemo(() => {
    return photos
      .filter((p) => p.status === "discard")
      .map((p) => p.name)
      .join("\n");
  }, [photos]);

  // Copy list to clipboard
  const handleCopyDiscardList = () => {
    navigator.clipboard.writeText(discardFileListText);
    setCopiedList(true);
    setTimeout(() => setCopiedList(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      {/* Premium Header */}
      <header className="bg-white border-b border-slate-100 py-5 px-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/10">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-slate-900 text-xl tracking-tight">
                Best Face Photo Selector
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                On-device photo comparator & Gemini-assisted expression grader
              </p>
            </div>
          </div>

          {photos.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                {photos.length} Photos Loaded
              </span>
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100"
              >
                <Trash2 className="w-3.5 h-3.5" /> Start Over
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {photos.length === 0 ? (
          /* Empty Initial State: Privacy Banner + Upload Area */
          <div className="space-y-4 animate-fade-in">
            <PrivacyBanner />
            <UploadZone onPhotosUploaded={handlePhotosUploaded} />
          </div>
        ) : (
          /* Active State: Lightroom Sidebar Grid + Split Comparison Panel */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Sidebar List (1/4 Width) */}
            <div className="lg:col-span-1 h-[340px] lg:h-[650px] sticky lg:top-24">
              <ImageGrid
                photos={photos}
                selectedPhotoIds={selectedPhotoIds}
                onToggleSelect={handleToggleSelect}
                onSetStatus={handleSetStatus}
                onRemovePhoto={handleRemovePhoto}
                filter={sidebarFilter}
                onFilterChange={setSidebarFilter}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
              />
            </div>

            {/* Stage (3/4 Width) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Core visual split screen workspace */}
              <ComparisonViewer
                photos={comparedPhotos}
                onSetStatus={handleSetStatus}
                onPrevPhoto={() => {}}
                onNextPhoto={() => {}}
              />

              {/* Gemini AI assistant drawer */}
              <AIAnalyzer
                photos={photos}
                onApplyAIRecommendations={handleApplyAIRecommendations}
              />
            </div>
          </div>
        )}
      </main>

      {/* Persistent Checkout Decision Bar */}
      {photos.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 py-4 px-6 shadow-2xl z-20">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Decision Status Checklist */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="font-semibold text-slate-700">Workspace Status:</span>
              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Keepers ({tallies.keep})
              </span>
              <span className="flex items-center gap-1 bg-rose-50 text-rose-800 px-2.5 py-1 rounded-full font-medium">
                <XCircle className="w-3.5 h-3.5 text-rose-600" /> Discards ({tallies.discard})
              </span>
              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                Undecided ({tallies.undecided})
              </span>
            </div>

            {/* Core Action Button Trigger */}
            <div className="flex items-center gap-2">
              <button
                onClick={downloadKeepers}
                disabled={tallies.keep === 0}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download Keepers
              </button>

              {tallies.discard > 0 && (
                <button
                  onClick={() => setShowDeleteHelp(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all"
                >
                  Delete Helper ({tallies.discard})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal / Overlay helper explaining file delete restrictions */}
      {showDeleteHelp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-4">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setShowDeleteHelp(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <h3 className="font-display font-bold text-slate-900 text-lg mt-4">
              How to Delete Discarded Photos from iPhone
            </h3>
            
            <p className="text-slate-600 text-sm mt-2 leading-relaxed">
              Due to Apple's sandbox security, <strong>no web application can directly access or delete files from your iPhone's native Photo Library</strong>.
              However, we have created an easy workflow to help you clean them up:
            </p>

            {/* Steps list */}
            <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-2.5 mt-4 border-l-2 border-indigo-500 pl-4 py-1">
              <li>
                Click <strong className="text-slate-800">"Download Keepers"</strong> in the workspace footer to download your perfect selected shots to your Files or Downloads.
              </li>
              <li>
                Below is the list of photo filenames you marked to <strong className="text-rose-600">discard</strong>. Copy this list.
              </li>
              <li>
                Open the native <strong className="text-slate-800">Photos App</strong> on your iPhone.
              </li>
              <li>
                Tap the Search tab at the bottom, paste a filename, and tap Delete! Or search for the scene and quickly select the duplicates you want to delete.
              </li>
            </ol>

            {/* Clipboard list */}
            <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Discard File List ({tallies.discard})
                </span>
                <button
                  onClick={handleCopyDiscardList}
                  className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  <Clipboard className="w-3 h-3" />
                  {copiedList ? "Copied!" : "Copy List"}
                </button>
              </div>
              <pre className="text-xs font-mono text-slate-600 bg-white p-3 rounded-lg border border-slate-200/60 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {discardFileListText}
              </pre>
            </div>

            <button
              onClick={() => setShowDeleteHelp(false)}
              className="w-full mt-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow transition-all cursor-pointer"
            >
              Done, back to workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
