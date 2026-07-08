import React, { useState, useRef, useEffect } from "react";
import { 
  Check, X, ZoomIn, ZoomOut, Maximize2, Minimize2, 
  ChevronLeft, ChevronRight, Sliders, Info, ShieldCheck
} from "lucide-react";
import { UploadedPhoto } from "../types";

interface ComparisonViewerProps {
  photos: UploadedPhoto[];
  onSetStatus: (id: string, status: "keep" | "discard" | "undecided") => void;
  onPrevPhoto: () => void;
  onNextPhoto: () => void;
}

export default function ComparisonViewer({
  photos,
  onSetStatus,
  onPrevPhoto,
  onNextPhoto,
}: ComparisonViewerProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [layoutMode, setLayoutMode] = useState<"side-by-side" | "single">("side-by-side");
  const containerRef = useRef<HTMLDivElement>(null);

  // If we only have 1 photo selected, force single layout
  const actualLayout = photos.length <= 1 ? "single" : layoutMode;

  // Handle click on an image to toggle zoom focused on the clicked point
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (zoom === 1) {
      setZoom(2.5);
      setZoomOrigin({ x, y });
    } else {
      setZoom(1);
      setZoomOrigin({ x: 50, y: 50 });
    }
  };

  // Reset zoom when photos list changes
  useEffect(() => {
    setZoom(1);
    setZoomOrigin({ x: 50, y: 50 });
  }, [photos]);

  const increaseZoom = () => {
    setZoom((prev) => Math.min(prev + 0.5, 4));
  };

  const decreaseZoom = () => {
    setZoom((prev) => Math.max(prev - 0.5, 1));
  };

  const resetZoom = () => {
    setZoom(1);
    setZoomOrigin({ x: 50, y: 50 });
  };

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[500px] bg-white border border-slate-100 rounded-2xl shadow-sm">
        <Sliders className="w-12 h-12 text-slate-300 stroke-[1.5] mb-4 animate-pulse" />
        <h3 className="font-display font-semibold text-slate-700 text-lg">
          No Photos Selected for Comparison
        </h3>
        <p className="text-slate-400 text-sm mt-1 max-w-sm">
          Select one or more photos from the left gallery to view them here and analyze details.
        </p>
      </div>
    );
  }

  // Slice photos to maximum 2 for side-by-side, or 1 for single
  const displayPhotos = actualLayout === "side-by-side" ? photos.slice(0, 2) : [photos[0]];

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950 border-b border-slate-800 text-white">
        <div className="flex items-center gap-2">
          <span className="bg-slate-800 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-300">
            Compare Mode
          </span>
          <p className="text-xs text-slate-400 hidden sm:block">
            {actualLayout === "side-by-side" 
              ? "Comparing 2 Photos Side-by-Side" 
              : `Inspecting: ${photos[0]?.name}`}
          </p>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
          <button
            onClick={decreaseZoom}
            disabled={zoom <= 1}
            title="Zoom Out"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono px-2 min-w-[50px] text-center text-slate-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={increaseZoom}
            disabled={zoom >= 4}
            title="Zoom In"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {zoom > 1 && (
            <button
              onClick={resetZoom}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded transition-all ml-1"
            >
              Fit
            </button>
          )}
        </div>

        {/* Layout Selectors */}
        <div className="flex items-center gap-1">
          {photos.length > 1 && (
            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
              <button
                onClick={() => setLayoutMode("side-by-side")}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  layoutMode === "side-by-side"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setLayoutMode("single")}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  layoutMode === "single"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Single Detail
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Synchronized Lightroom Workspace */}
      <div 
        ref={containerRef}
        className={`flex-1 min-h-[420px] bg-slate-950 p-4 grid gap-4 relative overflow-hidden ${
          displayPhotos.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {displayPhotos.map((photo, index) => {
          return (
            <div 
              key={photo.id} 
              className="relative rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col justify-between"
            >
              {/* Image Container with crop/zoom origin application */}
              <div className="flex-1 w-full relative flex items-center justify-center overflow-hidden cursor-crosshair group">
                <img
                  src={photo.localUrl}
                  alt={photo.name}
                  onClick={handleImageClick}
                  className="max-h-[350px] w-auto h-auto object-contain transition-transform duration-200 select-none"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                  }}
                />
                
                {/* Sync magnifying glass tutorial overlay */}
                {zoom === 1 && (
                  <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-sm text-slate-300 px-2 py-1 rounded text-[10px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    Click anywhere to focus zoom
                  </div>
                )}
              </div>

              {/* Bottom Details/Actions */}
              <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between gap-3 text-slate-200">
                <div className="min-w-0">
                  <span className="bg-slate-800 text-slate-400 font-mono text-[9px] px-1.5 py-0.5 rounded uppercase">
                    Slot {index + 1}
                  </span>
                  <p className="text-xs font-medium truncate mt-1 text-slate-300" title={photo.name}>
                    {photo.name}
                  </p>
                </div>

                {/* Keep/Discard Quick Toggles */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onSetStatus(photo.id, "keep")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      photo.status === "keep"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                        : "bg-slate-800 text-slate-400 hover:bg-emerald-700/30 hover:text-emerald-400"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" /> Keep
                  </button>
                  <button
                    onClick={() => onSetStatus(photo.id, "discard")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      photo.status === "discard"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-900/20"
                        : "bg-slate-800 text-slate-400 hover:bg-rose-700/30 hover:text-rose-400"
                    }`}
                  >
                    <X className="w-3.5 h-3.5" /> Discard
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Notice about Synchronized Lightroom functionality */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-1.5 font-sans">
        <Info className="w-3.5 h-3.5 text-indigo-400" />
        <span>
          <strong>Pro-Workflow Hint:</strong> Click on a face in one photo to instantly zoom <strong>{Math.round(zoom * 100)}%</strong> on that precise coordinate across BOTH photos for closed eyes & smile comparisons!
        </span>
      </div>
    </div>
  );
}
