import React, { useCallback, useState } from "react";
import { Upload, Image as ImageIcon, Camera, AlertCircle } from "lucide-react";
import { UploadedPhoto } from "../types";

interface UploadZoneProps {
  onPhotosUploaded: (photos: UploadedPhoto[]) => void;
}

export default function UploadZone({ onPhotosUploaded }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFiles = useCallback(async (files: FileList) => {
    setError(null);
    const validPhotos: UploadedPhoto[] = [];

    const fileArray = Array.from(files).filter(file => 
      file.type.startsWith("image/")
    );

    if (fileArray.length === 0) {
      setError("Please drop or select valid image files (JPEG, PNG, HEIC, etc.).");
      return;
    }

    // Limit to process at most 50 files at once for performance
    const filesToProcess = fileArray.slice(0, 50);
    if (fileArray.length > 50) {
      setError("Processing the first 50 images at once. You can add more later.");
    }

    // Helper to resize image using Canvas for lightweight base64 AI payloads
    const resizeImageForAI = (dataUrl: string, maxDim = 1024): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            // 85% quality Jpeg results in incredibly small payloads (under 100KB)
            const compressed = canvas.toDataURL("image/jpeg", 0.85);
            resolve(compressed.split(",")[1] || "");
          } else {
            resolve(dataUrl.split(",")[1] || "");
          }
        };
        img.onerror = () => {
          resolve(dataUrl.split(",")[1] || "");
        };
        img.src = dataUrl;
      });
    };

    const loaders = filesToProcess.map((file) => {
      return new Promise<UploadedPhoto>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          if (!e.target?.result) {
            reject(new Error("Failed to read file"));
            return;
          }

          const dataUrl = e.target.result as string;
          // Scale down the base64 image for lightning-fast Gemini multi-modal payloads
          const base64Data = await resizeImageForAI(dataUrl);

          // Create an image object to get the original dimensions
          const img = new Image();
          img.onload = () => {
            const photo: UploadedPhoto = {
              id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              size: file.size,
              type: file.type,
              localUrl: URL.createObjectURL(file), // Best for instant full-quality rendering
              base64: base64Data,
              status: "undecided",
              width: img.width,
              height: img.height,
            };
            resolve(photo);
          };
          img.onerror = () => {
            // Fallback if we cannot get dimensions
            const photo: UploadedPhoto = {
              id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              size: file.size,
              type: file.type,
              localUrl: URL.createObjectURL(file),
              base64: base64Data,
              status: "undecided",
            };
            resolve(photo);
          };
          img.src = dataUrl;
        };

        reader.onerror = () => reject(new Error("FileReader error"));
        reader.readAsDataURL(file);
      });
    });

    try {
      const loadedPhotos = await Promise.all(loaders);
      onPhotosUploaded(loadedPhotos);
    } catch (err) {
      console.error("Error reading files:", err);
      setError("An error occurred while loading your photos. Please try again.");
    }
  }, [onPhotosUploaded]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div
        id="upload-dropzone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-2xl p-10 md:p-16 transition-all duration-300 text-center flex flex-col items-center justify-center cursor-pointer min-h-[300px] ${
          isDragging
            ? "border-indigo-500 bg-indigo-50/50 scale-[1.01]"
            : "border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/50"
        }`}
      >
        <input
          id="photo-file-input"
          type="file"
          multiple
          accept="image/*"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={onFileSelect}
        />

        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
          <Camera className="w-8 h-8" />
        </div>

        <h2 className="font-display font-semibold text-slate-800 text-xl md:text-2xl">
          Upload your burst or duplicate photos
        </h2>
        
        <p className="text-slate-500 text-sm md:text-base mt-2 max-w-md">
          Drag and drop multiple similar photos here, or click to browse. Compare them side-by-side to choose the perfect shot.
        </p>

        <div className="flex gap-4 mt-6 text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" /> Supports Burst Shots & HEIC/JPEG/PNG
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5" /> Processed Locally
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-sm max-w-4xl mx-auto">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
