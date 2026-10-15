"use client";

import React, { useRef, useState, useEffect } from "react";
import { PenTool, RotateCcw, Check, X, Eye, EyeOff } from "lucide-react";

interface SignatureCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  initialSignature?: string | null;
  signatoryName?: string;
}

export default function SignatureCanvas({
  isOpen,
  onClose,
  onSave,
  initialSignature,
  signatoryName,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  // Initialize canvas
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI displays for crisp strokes
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Canvas background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Stroke styles
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a"; // Deep navy slate

    setHasDrawn(false);
    setShowPreview(false);
  };

  useEffect(() => {
    if (isOpen) {
      // Delay slightly so modal DOM layout has computed dimensions
      const timer = setTimeout(() => {
        initCanvas();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Coordinate helper relative to canvas
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      if (e.touches.length > 0) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
    } else {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
  };

  const handleClear = () => {
    initCanvas();
  };

  const handleTogglePreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!showPreview) {
      setPreviewDataUrl(canvas.toDataURL("image/png"));
      setShowPreview(true);
    } else {
      setShowPreview(false);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      alert("Please draw your signature before saving.");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Digital Signature</h3>
              <p className="text-[11px] text-slate-500">
                Sign using mouse, touchpad, touchscreen, stylus, or mobile finger.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3">
          {signatoryName && (
            <div className="text-xs text-slate-600 flex items-center justify-between px-1">
              <span>Signatory: <strong>{signatoryName}</strong></span>
              <span className="text-[11px] text-slate-400 font-mono">Form QF-003-05-307</span>
            </div>
          )}

          {/* Canvas Box */}
          <div className="relative border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner">
            {showPreview && previewDataUrl ? (
              <div className="w-full h-56 flex flex-col items-center justify-center bg-slate-50 p-4">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Signature Preview on Certificate
                </p>
                <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-2xs max-w-xs">
                  <img
                    src={previewDataUrl}
                    alt="Signature Preview"
                    className="max-h-24 w-auto object-contain mx-auto"
                  />
                  <div className="mt-2 border-t border-slate-300 pt-1 text-center font-mono text-[10px] text-slate-500">
                    Signatory: {signatoryName || "Authorized Inspector"}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ touchAction: "none" }}
                  className="w-full h-56 block cursor-crosshair bg-white"
                />

                {/* Guide Watermark Line */}
                <div className="pointer-events-none absolute bottom-8 left-8 right-8 border-b border-slate-300 flex items-center justify-between text-[10px] text-slate-400 pb-0.5">
                  <span>Sign on the line above</span>
                  <span>✕</span>
                </div>
              </>
            )}
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            {showPreview
              ? "This is how your signature will appear on the final certificate and PDF."
              : "Tip: On mobile devices, hold your phone horizontally for a larger signing area."}
          </p>
        </div>

        {/* Modal Controls Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={showPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Clear
            </button>

            <button
              type="button"
              onClick={handleTogglePreview}
              disabled={!hasDrawn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition disabled:opacity-40"
            >
              {showPreview ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  Preview
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!hasDrawn}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-2xs transition disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              Save Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
