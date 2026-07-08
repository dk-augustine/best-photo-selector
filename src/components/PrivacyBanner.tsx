import React from "react";
import { Shield, EyeOff, Cpu, Lock } from "lucide-react";

export default function PrivacyBanner() {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 mb-6 max-w-4xl mx-auto shadow-sm">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-slate-900 text-lg leading-snug">
            Your Privacy & Local-First Processing
          </h3>
          <p className="text-slate-600 text-sm mt-1 leading-relaxed">
            We understand your photos are deeply personal. To address your privacy concerns, 
            this web application is designed with a <strong className="text-slate-800">local-first architecture</strong>:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex gap-2 items-start">
              <EyeOff className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-slate-800">On-Device Browsing</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your photos are loaded directly into your browser's local memory. They are never saved or sent to any server during manual comparison.
                </p>
              </div>
            </div>

            <div className="flex gap-2 items-start">
              <Cpu className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-slate-800">Secure AI Analysis</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  If you opt-in to use the AI Smart Assistant, the selected images are analyzed in-transit by Gemini, then immediately forgotten.
                </p>
              </div>
            </div>

            <div className="flex gap-2 items-start">
              <Lock className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-slate-800">No App Store Hassles</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Avoid complicated Apple developer accounts, certificates, or app installation. Access this secure workspace instantly on iOS Safari, macOS, or any device.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
