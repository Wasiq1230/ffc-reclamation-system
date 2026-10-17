"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ScanLine,
  UploadCloud,
  FileCheck2,
  Camera,
  Video,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Award,
  Wrench,
  FileText,
  X,
  Layers,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { getCameraStream, stopCameraStream, captureVideoFrame } from "@/lib/camera";
import PageHeader from "@/components/PageHeader";
import { registerCloseHandler } from "@/lib/modalRegistry";

interface PlantItem {
  id: number;
  name: string;
  code: string;
  departments?: { id: number; name: string; code?: string }[];
}

export default function CertificateScannerPage() {
  const router = useRouter();

  // File & Preview state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [rawOcrText, setRawOcrText] = useState<string>("");
  const [showRawText, setShowRawText] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [unreadableFields, setUnreadableFields] = useState<string[]>([]);

  // Live Camera state & refs
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Plants & Departments for dropdown mapping
  const [plants, setPlants] = useState<PlantItem[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string; code?: string }[]>([]);

  // Extracted Form State
  const [formData, setFormData] = useState({
    notification_no: "",
    work_order_ref: "",
    valve_description: "",
    valve_tag_no: "",
    valve_serial_no: "",
    size: "",
    pressure_rating: "",
    source: "PLANT_1",
    plant_id: "",
    department_id: "",
    priority: "NORMAL",
    operation_categories: "",
    reclaimed_by_name: "",
    checked_by_name: "",
    seat_test_us_pressure: "",
    seat_test_ds_pressure: "",
    body_test_pressure: "",
  });

  // Callback ref for Video element
  const setVideoRef = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element && streamRef.current) {
      element.srcObject = streamRef.current;
      element.play().catch((err) => console.log("Video auto-play error:", err));
    }
  }, []);

  // Load plants on mount
  useEffect(() => {
    async function loadOrg() {
      try {
        const orgData = await api.getPlants();
        const list: PlantItem[] = Array.isArray(orgData) ? orgData : [];
        setPlants(list);
        if (list.length > 0) {
          const p1 = list.find((p) => p.code === "PLANT_1") || list[0];
          setDepartments(p1.departments || []);
          setFormData((prev) => ({
            ...prev,
            source: p1.code,
            plant_id: String(p1.id),
            department_id: p1.departments?.[0] ? String(p1.departments[0].id) : "",
          }));
        }
      } catch (err) {
        console.error("Failed to load plants:", err);
      }
    }
    loadOrg();

    return () => {
      stopCamera();
    };
  }, []);

  // Camera Management
  const startCamera = async (facing: "environment" | "user" = cameraFacing) => {
    stopCamera();
    setError(null);
    setCameraLoading(true);
    setIsCameraActive(true);

    try {
      const stream = await getCameraStream(facing);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error("Camera startup failed:", err);
      setError(err?.message || "Could not start camera. Please verify device permissions or use file upload.");
      setIsCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraLoading(false);
  };

  useEffect(() => {
    if (!isCameraActive) return;
    const unregister = registerCloseHandler("scannerCamera", stopCamera, 30);
    return unregister;
  }, [isCameraActive]);

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  const snapPhoto = async () => {
    if (!videoRef.current) return;
    try {
      const { file: capturedFile, dataUrl } = await captureVideoFrame(
        videoRef.current,
        "scanned_certificate"
      );
      stopCamera();
      processCertificateFile(capturedFile, dataUrl);
    } catch (err: any) {
      setError(err.message || "Failed to capture snapshot from camera.");
    }
  };

  const handleSourceChange = (newSource: string) => {
    const selectedPlant = plants.find((p) => p.code === newSource);
    const depts = selectedPlant?.departments || [];
    setDepartments(depts);
    setFormData((prev) => ({
      ...prev,
      source: newSource,
      plant_id: selectedPlant ? String(selectedPlant.id) : "",
      department_id: depts.length > 0 ? String(depts[0].id) : "",
    }));
  };

  // Main file processing & OCR extraction
  const processCertificateFile = async (selectedFile: File, explicitDataUrl?: string) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setSuccessResult(null);
    setInfoMessage(null);

    // Display image immediately
    if (explicitDataUrl) {
      setPreviewUrl(explicitDataUrl);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }

    // Call OCR Scan Extract API
    setScanning(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", selectedFile);
      const res = await api.scanExtractCertificate(uploadData);

      if (res && res.success && res.extracted_data) {
        const ext = res.extracted_data;
        setRawOcrText(res.raw_text || "");

        // Find matching plant & department
        let matchedPlant = plants.find((p) => p.id === ext.plant_id || p.code === ext.source) || plants[0];
        let matchedPlantId = matchedPlant ? String(matchedPlant.id) : (ext.plant_id ? String(ext.plant_id) : "1");
        let matchedDeptId = "";

        if (matchedPlant) {
          const deptList = matchedPlant.departments || [];
          setDepartments(deptList);
          if (ext.department_id) {
            matchedDeptId = String(ext.department_id);
          } else if (ext.department_name) {
            const match = deptList.find((d: any) =>
              d.name?.toLowerCase().includes(ext.department_name.toLowerCase()) ||
              ext.department_name.toLowerCase().includes(d.name?.toLowerCase())
            );
            matchedDeptId = match ? String(match.id) : (deptList[0] ? String(deptList[0].id) : "1");
          } else {
            matchedDeptId = deptList[0] ? String(deptList[0].id) : "1";
          }
        }

        setFormData((prev) => ({
          ...prev,
          notification_no: ext.notification_no || "",
          work_order_ref: ext.work_order_ref || (ext.notification_no ? `WO-${ext.notification_no}` : ""),
          valve_description: ext.valve_description || "Industrial Valve (Scanned from Form)",
          valve_tag_no: ext.valve_tag_no || "",
          valve_serial_no: ext.valve_serial_no || "",
          size: ext.size || "",
          pressure_rating: ext.pressure_rating || "",
          source: ext.source || (matchedPlant ? matchedPlant.code : "PLANT_1"),
          plant_id: matchedPlantId,
          department_id: matchedDeptId || "1",
          priority: prev.priority || "NORMAL",
          operation_categories: ext.operation_categories || prev.operation_categories || "",
          reclaimed_by_name: ext.reclaimed_by_name || "",
          checked_by_name: ext.checked_by_name || "",
          seat_test_us_pressure:
            ext.seat_test_us_pressure !== null && ext.seat_test_us_pressure !== undefined
              ? String(ext.seat_test_us_pressure)
              : "",
          seat_test_ds_pressure:
            ext.seat_test_ds_pressure !== null && ext.seat_test_ds_pressure !== undefined
              ? String(ext.seat_test_ds_pressure)
              : "",
          body_test_pressure:
            ext.body_test_pressure !== null && ext.body_test_pressure !== undefined
              ? String(ext.body_test_pressure)
              : "",
        }));

        setUnreadableFields(ext.unreadable_fields || []);

        setInfoMessage(
          `Extracted data from Form QF-003-05-307. Notification: ${ext.notification_no || "Detected"} | Description: ${ext.valve_description || "Ready"}`
        );
      } else {
        setFormData((prev) => ({
          ...prev,
          notification_no: prev.notification_no || `NOTIF-${Date.now().toString().slice(-6)}`,
          valve_description: prev.valve_description || "Reclaimed Valve (Form QF-003)",
        }));
        setInfoMessage("Certificate image uploaded. Please verify the technical fields below.");
      }
    } catch (err: any) {
      console.error("Scan extraction error:", err);
      setFormData((prev) => ({
        ...prev,
        notification_no: prev.notification_no || `NOTIF-${Date.now().toString().slice(-6)}`,
        valve_description: prev.valve_description || "Reclaimed Valve (Form QF-003)",
      }));
      setInfoMessage("Certificate image attached. Technical fields are ready for review.");
    } finally {
      setScanning(false);
    }
  };

  const handle1ClickAutoRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please capture or upload a certificate image first.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const data = new FormData();
      data.append("file", file);
      if (formData.notification_no) data.append("notification_no", formData.notification_no);
      if (formData.valve_description) data.append("valve_description", formData.valve_description);
      if (formData.valve_tag_no) data.append("valve_tag_no", formData.valve_tag_no);
      if (formData.valve_serial_no) data.append("valve_serial_no", formData.valve_serial_no);
      if (formData.size) data.append("size", formData.size);
      if (formData.pressure_rating) data.append("pressure_rating", formData.pressure_rating);
      if (formData.source) data.append("source", formData.source);
      if (formData.plant_id) data.append("plant_id", formData.plant_id);
      if (formData.department_id) data.append("department_id", formData.department_id);
      if (formData.reclaimed_by_name) data.append("reclaimed_by_name", formData.reclaimed_by_name);
      if (formData.checked_by_name) data.append("checked_by_name", formData.checked_by_name);
      if (formData.seat_test_us_pressure) data.append("seat_test_us_pressure", formData.seat_test_us_pressure);
      if (formData.seat_test_ds_pressure) data.append("seat_test_ds_pressure", formData.seat_test_ds_pressure);
      if (formData.body_test_pressure) data.append("body_test_pressure", formData.body_test_pressure);
      if (formData.priority) data.append("priority", formData.priority);
      if (formData.operation_categories) data.append("operation_categories", formData.operation_categories);

      const result = await api.scanAndRegisterCertificate(data);
      setSuccessResult(result);
    } catch (err: any) {
      console.error("Auto registration error:", err);
      setError(err?.message || "Failed to auto-register scanned certificate.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    stopCamera();
    setFile(null);
    setPreviewUrl("");
    setSuccessResult(null);
    setRawOcrText("");
    setUnreadableFields([]);
    setError(null);
    setInfoMessage(null);
    const input = document.getElementById("certFileInput") as HTMLInputElement;
    if (input) input.value = "";
  };

  const buildManualRegisterQuery = () => {
    const q = new URLSearchParams();
    if (formData.notification_no) q.append("notification_no", formData.notification_no);
    if (formData.valve_description) q.append("valve_description", formData.valve_description);
    if (formData.valve_tag_no) q.append("valve_tag_no", formData.valve_tag_no);
    if (formData.size) q.append("size", formData.size);
    if (formData.pressure_rating) q.append("pressure_rating", formData.pressure_rating);
    if (formData.source) q.append("source", formData.source);
    if (formData.priority) q.append("priority", formData.priority);
    if (formData.operation_categories) q.append("operation_categories", formData.operation_categories);
    return `/jobs/new?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Certificate & Slip Scanner"
        description="Form QF-003-05-307 Optical OCR & Direct Reclamation Registry"
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
            Hardware OCR
          </span>
        }
        actions={
          <Link
            href="/jobs"
            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded text-xs font-semibold shadow-2xs transition-colors"
          >
            Master Register &rarr;
          </Link>
        }
      />

      {/* Notice & Error Messages */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start justify-between gap-3 text-rose-800 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold text-rose-900">Scanner Notice</p>
              <p className="text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="p-1 text-rose-500 hover:text-rose-800 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {infoMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{infoMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setInfoMessage(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {unreadableFields.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Handwritten Annotations & Field Notes Detected (No Operations/Pressures Fabricated):</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-700 pl-1 text-[11px]">
            {unreadableFields.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Notification Banner */}
      {successResult && (
        <div className="p-5 bg-white border border-emerald-300 rounded-xl shadow-xs text-slate-900 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Certificate & Reclamation Job Registered Successfully
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Original paper slip attached to job record. Generated tracking identifiers:
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessResult(null)}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Reclamation ID</span>
              <span className="font-mono font-bold text-emerald-800 text-sm">{successResult.tracking_id}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Certificate No</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{successResult.certificate_number}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Plant / Area</span>
              <span className="font-semibold text-slate-800">
                {successResult.plant_name || "FFC Plant"} &bull; {successResult.department_name || "Workshop"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <Link
              href={`/jobs/${successResult.job_id}`}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Wrench className="w-3.5 h-3.5" /> View Reclamation Job
            </Link>
            <Link
              href="/certificates"
              className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Award className="w-3.5 h-3.5 text-emerald-600" /> Certificates List
            </Link>
            <button
              type="button"
              onClick={resetAll}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-900 ml-auto flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Scan Another Slip
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera / Upload Zone */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                Certificate Slip Capture
              </span>

              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={() => startCamera("environment")}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Video className="w-3.5 h-3.5 text-emerald-400" /> Use Camera
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    title="Switch camera"
                    className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Close
                  </button>
                </div>
              )}
            </div>

            {/* LIVE CAMERA MODE */}
            {isCameraActive && (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-slate-900">
                  {cameraLoading && (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-2 z-20">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                      <span className="text-xs font-mono">Opening camera feed...</span>
                    </div>
                  )}

                  <video
                    ref={setVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Top Live Badge */}
                  <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1.5 shadow-sm z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE CAMERA
                  </div>

                  {/* Viewfinder crosshairs */}
                  <div className="absolute inset-4 border border-emerald-400/40 rounded pointer-events-none flex flex-col justify-between p-2 z-10">
                    <div className="flex justify-between text-emerald-400/80 text-[10px] font-mono">
                      <span>┌ FORM QF-003</span>
                      <span>┐</span>
                    </div>
                    <div className="flex justify-between text-emerald-400/80 text-[10px] font-mono">
                      <span>└</span>
                      <span>ALIGNED ┘</span>
                    </div>
                  </div>

                  {/* Bottom Snap Button */}
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center z-20">
                    <button
                      type="button"
                      onClick={snapPhoto}
                      className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-full shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-slate-950" /> Snap Photo
                    </button>
                  </div>
                </div>

                <p className="text-center text-[11px] text-slate-500">
                  Align Form QF-003-05-307 inside the crosshairs, then click Snap Photo.
                </p>
              </div>
            )}

            {/* FILE UPLOAD & DROP ZONE */}
            {!isCameraActive && (
              <div className="space-y-3">
                <input
                  id="certFileInput"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processCertificateFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("certFileInput") as HTMLInputElement;
                      if (input) input.click();
                    }}
                    className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center active:scale-98"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>🖼️ Open Gallery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startCamera("environment")}
                    className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded border border-slate-300 shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
                  >
                    <Video className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Open Camera</span>
                  </button>
                </div>

                {!previewUrl ? (
                  <label
                    htmlFor="certFileInput"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        processCertificateFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border border-dashed rounded-lg p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] block ${
                      isDragging
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center mb-2 mx-auto shadow-2xs">
                      <UploadCloud className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      Click or Drag & Drop Certificate Image
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
                      Supports JPG, PNG, WEBP (Form QF-003-05-307)
                    </div>
                  </label>
                ) : (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[420px]">
                      <img
                        src={previewUrl}
                        alt="Scanned Certificate"
                        className="w-full object-contain max-h-[420px]"
                      />

                      {scanning && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xs flex flex-col items-center justify-center text-white space-y-2 p-4 z-20">
                          <RefreshCw className="w-7 h-7 animate-spin text-emerald-400" />
                          <div className="text-xs font-bold text-emerald-300">
                            Scanning & Extracting Form Fields...
                          </div>
                          <div className="text-[11px] text-slate-300">
                            Analyzing Form QF-003-05-307
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500 truncate max-w-[180px] font-mono text-[11px]">
                        {file?.name || "scanned_slip.jpg"}
                      </span>
                      <label
                        htmlFor="certFileInput"
                        className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer text-xs"
                      >
                        <RefreshCw className="w-3 h-3" /> Replace Photo
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Collapsible Raw OCR Transcript */}
            {rawOcrText && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowRawText(!showRawText)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 py-1 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    {showRawText ? "Hide Raw OCR Transcript" : "View Raw OCR Transcript"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {rawOcrText.length} chars
                  </span>
                </button>
                {showRawText && (
                  <pre className="p-3 bg-slate-50 text-slate-800 text-[11px] rounded border border-slate-200 overflow-x-auto whitespace-pre-wrap font-mono max-h-48 select-all">
                    {rawOcrText}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Auto-Extracted & Editable Fields Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handle1ClickAutoRegister}
            className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  Extracted Certificate Metadata
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Review or adjust extracted values before 1-click registration.
                </p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded self-start sm:self-auto">
                Form QF-003-05-307
              </span>
            </div>

            {/* Plant, Department & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Source Plant <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="PLANT_1">Plant 1 (FFC)</option>
                  <option value="PLANT_2">Plant 2 (FFC)</option>
                  <option value="EXTERNAL">External Customer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Department / Plant Area <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 bg-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ""}
                    </option>
                  ))}
                  {departments.length === 0 && (
                    <option value="1">General Workshop</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className={`w-full px-2.5 py-1.5 border rounded focus:outline-none bg-white font-medium ${
                    formData.priority === "EMERGENCY"
                      ? "border-rose-400 bg-rose-50 text-rose-800 font-bold"
                      : formData.priority === "URGENT"
                      ? "border-amber-400 bg-amber-50 text-amber-800 font-bold"
                      : "border-slate-300 focus:border-emerald-600 text-slate-800"
                  }`}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">⚡ Urgent</option>
                  <option value="EMERGENCY">🚨 EMERGENCY</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            {/* Notification & WO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Notification No <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={formData.notification_no}
                  onChange={(e) => setFormData({ ...formData, notification_no: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Work Order / Ref
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={formData.work_order_ref}
                  onChange={(e) => setFormData({ ...formData, work_order_ref: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>
            </div>

            {/* Valve Description */}
            <div className="text-xs">
              <label className="block text-slate-700 font-semibold mb-1">
                Valve Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={formData.valve_description}
                onChange={(e) => setFormData({ ...formData, valve_description: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Operation Categories */}
            <div className="text-xs">
              <label className="block text-slate-700 font-semibold mb-1">
                Operation Categories (Multiple / Custom)
              </label>
              <input
                type="text"
                autoComplete="off"
                value={formData.operation_categories}
                onChange={(e) => setFormData({ ...formData, operation_categories: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Comma-separated operations required for reclamation.
              </span>
            </div>

            {/* Tag, Serial, Size, Rating */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tag No</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={formData.valve_tag_no}
                  onChange={(e) => setFormData({ ...formData, valve_tag_no: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Serial No</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={formData.valve_serial_no}
                  onChange={(e) => setFormData({ ...formData, valve_serial_no: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Size</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rating</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={formData.pressure_rating}
                  onChange={(e) => setFormData({ ...formData, pressure_rating: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>
            </div>

            {/* Test Pressures (Form QF-003) */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                  Hydrostatic Testing Pressures (PSI)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Form QF-003</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">Seat Test U/S</label>
                  <input
                    type="number"
                    step="any"
                    autoComplete="off"
                    value={formData.seat_test_us_pressure}
                    onChange={(e) => setFormData({ ...formData, seat_test_us_pressure: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">Seat Test D/S</label>
                  <input
                    type="number"
                    step="any"
                    autoComplete="off"
                    value={formData.seat_test_ds_pressure}
                    onChange={(e) => setFormData({ ...formData, seat_test_ds_pressure: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">Body Hydro Test</label>
                  <input
                    type="number"
                    step="any"
                    autoComplete="off"
                    value={formData.body_test_pressure}
                    onChange={(e) => setFormData({ ...formData, body_test_pressure: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Technicians */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reclaimed By (Technician)
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={formData.reclaimed_by_name}
                  onChange={(e) => setFormData({ ...formData, reclaimed_by_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Checked By (Engineer / Inspector)
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={formData.checked_by_name}
                  onChange={(e) => setFormData({ ...formData, checked_by_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Action Bar: Sticky at bottom on mobile, static on desktop */}
            <div className="sticky bottom-16 sm:static z-20 bg-white/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none p-3 sm:p-0 border-t sm:border-t-0 border-slate-200/90 rounded-2xl sm:rounded-none shadow-lg sm:shadow-none flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <Link
                href={buildManualRegisterQuery()}
                className="text-slate-600 hover:text-slate-900 font-semibold py-1.5 transition-colors text-center sm:text-left"
              >
                Send to Detailed Manual Registration &rarr;
              </Link>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition active:scale-95"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={submitting || scanning || !file}
                  className="flex-1 sm:flex-none px-6 py-2.5 min-h-[48px] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Registering...
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4" /> 1-Click Auto-Register
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
