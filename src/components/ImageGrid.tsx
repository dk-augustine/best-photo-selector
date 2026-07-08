import React from "react";
import { Check, X, HelpCircle, Eye, Trash2, EyeOff } from "lucide-react";
import { UploadedPhoto } from "../types";

interface ImageGridProps {
  photos: UploadedPhoto[];
  selectedPhotoIds: string[];
  onToggleSelect: (id: string) => void;
  onSetStatus: (id: string, status: "keep" | "discard" | "undecided") => void;
  onRemovePhoto: (id: string) => void;
  filter: "all" | "keep" | "discard" | "undecided";
  onFilterChange: (filter: "all" | "keep" | "discard" | "undecided") => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export default function ImageGrid({
  photos,
  selectedPhotoIds,
  onToggleSelect,
  onSetStatus,
  onRemovePhoto,
  filter,
  onFilterChange,
  onSelectAll,
  onDeselectAll,
}: ImageGridProps) {
  const filteredPhotos = photos.filter((photo) => {
    if (filter === "all") return true;
    return photo.status === filter;
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
      {/* Header and Filters */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-display font-semibold text-slate-800 text-sm">
            Uploaded Photos ({photos.length})
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {selectedPhotoIds.length} Selected
          </span>
        </div>

        {/* Select All / Clear Quick Actions */}
        <div className="flex gap-2 mb-3 text-[10px]">
          {onSelectAll && (
            <button
              onClick={onSelectAll}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Select All (Max 30)
            </button>
          )}
          {onSelectAll && onDeselectAll && <span className="text-slate-300">|</span>}
          {onDeselectAll && (
            <button
              onClick={onDeselectAll}
              className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="grid grid-cols-4 gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
          {(["all", "keep", "discard", "undecided"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onFilterChange(tab)}
              className={`py-1.5 rounded-md font-medium capitalize transition-all ${
                filter === tab
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Thumbnails */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <EyeOff className="w-8 h-8 mx-auto stroke-[1.5] mb-2" />
            <p className="text-xs">No photos in this filter.</p>
          </div>
        ) : (
          filteredPhotos.map((photo) => {
            const isCompareSelected = selectedPhotoIds.includes(photo.id);
            return (
              <div
                key={photo.id}
                className={`group relative flex gap-3 p-2 rounded-xl border transition-all ${
                  isCompareSelected
                    ? "border-indigo-500 bg-indigo-50/10 shadow-sm"
                    : "border-slate-100 bg-white hover:border-slate-300"
                }`}
              >
                {/* Checkbox Overlay for Comparison selection */}
                <div 
                  onClick={() => onToggleSelect(photo.id)}
                  className="relative cursor-pointer shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-100 group"
                >
                  <img
                    src={photo.localUrl}
                    alt={photo.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                    isCompareSelected 
                      ? "bg-indigo-600/20 opacity-100" 
                      : "bg-black/40 opacity-0 group-hover:opacity-100"
                  }`}>
                    {isCompareSelected ? (
                      <div className="bg-indigo-600 text-white p-1 rounded-full">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <Eye className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="pr-6">
                    <p className="text-xs font-medium text-slate-700 truncate" title={photo.name}>
                      {photo.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {formatSize(photo.size)}
                    </p>
                  </div>

                  {/* Status Buttons */}
                  <div className="flex gap-1.5 mt-1">
                    <button
                      onClick={() => onSetStatus(photo.id, "keep")}
                      title="Keep this photo"
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                        photo.status === "keep"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                    >
                      <Check className="w-3 h-3" /> Keep
                    </button>
                    <button
                      onClick={() => onSetStatus(photo.id, "discard")}
                      title="Discard this photo"
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                        photo.status === "discard"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                      }`}
                    >
                      <X className="w-3 h-3" /> Discard
                    </button>
                    {photo.status !== "undecided" && (
                      <button
                        onClick={() => onSetStatus(photo.id, "undecided")}
                        title="Reset decisions"
                        className="p-1 rounded-md bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Delete button (remove from list) */}
                <button
                  onClick={() => onRemovePhoto(photo.id)}
                  className="absolute top-2 right-2 p-1 rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors"
                  title="Remove from workspace"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
