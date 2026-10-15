"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, getStoredUser } from "@/lib/api";
import { getCameraStream, stopCameraStream, captureVideoFrame } from "@/lib/camera";
import ConfirmModal from "@/components/ConfirmModal";
import {
  Wrench,
  Layers,
  Clock,
  CheckCircle2,
  Award,
  AlertTriangle,
  Building2,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  FileText,
  FileEdit,
  ChevronRight,
  Plus,
  Eye,
  RefreshCw,
  ExternalLink,
  Camera,
  User as UserIcon,
  Trash2,
  X,
  ZoomIn,
  Columns,
  Grid,
  UploadCloud,
  Video,
  ArrowRight,
  Check
} from "lucide-react";

const WORKFLOW_STEPS = [
  { key: "RECEIVED", label: "Received" },
  { key: "INSPECTION_IN_PROGRESS", label: "Inspecting" },
  { key: "RECLAMATION_IN_PROGRESS", label: "Reclamation" },
  { key: "TESTING_QUALITY_INSPECTION", label: "Pressure Testing" },
  { key: "COMPLETED", label: "Reclaimed" },
  { key: "CERTIFICATE_ISSUED", label: "Certified" },
  { key: "READY_FOR_DELIVERY", label: "Dispatched" },
];

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = Number(params.id);

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status transition modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Delete Confirm Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New Work Entry modal
  const WORK_OPERATION_CATEGORIES = [
    "Seat reclamation",
    "Body / Seat Machining",
    "Precision Lapping",
    "Stelliting Hardfacing",
    "Stem Polish / Built-up",
    "Gland Packing Replacement",
    "Bonnet Gasket Fabrication / Replacement",
    "Gate / Disc / Plug Refurbishment",
    "Back-seat Machining",
    "Flange Ends Repair",
  ];
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [selectedWorkCategories, setSelectedWorkCategories] = useState<string[]>(["Seat reclamation"]);
  const [customWorkCategory, setCustomWorkCategory] = useState("");
  const [opDetails, setOpDetails] = useState("");
  const [opHours, setOpHours] = useState(2.0);

  const toggleWorkCategory = (cat: string) => {
    setSelectedWorkCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAddCustomWorkCategory = () => {
    const trimmed = customWorkCategory.trim();
    if (trimmed && !selectedWorkCategories.includes(trimmed)) {
      setSelectedWorkCategories((prev) => [...prev, trimmed]);
      setCustomWorkCategory("");
    }
  };

  // New Test Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testCat, setTestCat] = useState("SEAT_TEST_US");
  const [testMethod, setTestMethod] = useState("HYDRAULIC");
  const [testPress, setTestPress] = useState(450);
  const [testUnit, setTestUnit] = useState("PSI");
  const [testResult, setTestResult] = useState("PASS");

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Photo Evidence State
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoStage, setPhotoStage] = useState<"BEFORE" | "AFTER">("BEFORE");
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoWorkDesc, setPhotoWorkDesc] = useState("");
  const [photoPerformedById, setPhotoPerformedById] = useState<string>("");
  const [photoDeptId, setPhotoDeptId] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoFilter, setPhotoFilter] = useState<"ALL" | "BEFORE" | "AFTER" | "COMPARISON">("ALL");
  const [lightboxPhoto, setLightboxPhoto] = useState<any | null>(null);

  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [availableDepts, setAvailableDepts] = useState<any[]>([]);

  // Inspection modal state
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspProblem, setInspProblem] = useState("");
  const [inspDamage, setInspDamage] = useState("");
  const [inspCondition, setInspCondition] = useState("Worn / Passing");
  const [inspScope, setInspScope] = useState("");
  const [inspSaving, setInspSaving] = useState(false);

  const openInspectionModal = () => {
    const latest = job?.inspections && job.inspections.length > 0 ? job.inspections[job.inspections.length - 1] : null;
    if (latest) {
      setInspProblem(latest.reported_problem || "");
      setInspDamage(latest.observed_damage || "");
      setInspCondition(latest.initial_condition || "Worn / Passing");
      setInspScope(latest.recommended_work || "");
    } else {
      setInspProblem("");
      setInspDamage("");
      setInspCondition("Worn / Passing");
      setInspScope("");
    }
    setShowInspectionModal(true);
  };

  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setInspSaving(true);
    try {
      await api.addInspection(jobId, {
        inspection_type: "INITIAL",
        reported_problem: inspProblem,
        observed_damage: inspDamage,
        initial_condition: inspCondition,
        recommended_work: inspScope,
      });
      setShowInspectionModal(false);
      fetchJob();
    } catch (err: any) {
      alert("Failed to record inspection observations: " + err.message);
    } finally {
      setInspSaving(false);
    }
  };

  const handleDeleteJob = async () => {
    setDeleting(true);
    try {
      await api.deleteJob(jobId);
      setShowDeleteModal(false);
      router.push("/jobs");
    } catch (err: any) {
      alert("Failed to delete entry: " + (err.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  const fetchJob = async () => {
    setLoading(true);
    try {
      const data = await api.getJobDetail(jobId);
      setJob(data);
      setNewStatus(data.status);
    } catch (err: any) {
      setError(err.message || "Failed to load reclamation job");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUser(getStoredUser());
    if (jobId) fetchJob();
    api.getUsers().then((res) => { if (Array.isArray(res)) setAvailableUsers(res); }).catch(() => {});
    api.getDepartments().then((res) => { if (Array.isArray(res)) setAvailableDepts(res); }).catch(() => {});
  }, [jobId]);

  // Live Camera inside Job Detail Photo Modal
  const [isPhotoCameraActive, setIsPhotoCameraActive] = useState(false);
  const [photoCameraFacing, setPhotoCameraFacing] = useState<"environment" | "user">("environment");
  const [photoCameraLoading, setPhotoCameraLoading] = useState(false);
  const photoVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);

  const setPhotoVideoRef = useCallback((el: HTMLVideoElement | null) => {
    photoVideoRef.current = el;
    if (el && photoStreamRef.current) {
      el.srcObject = photoStreamRef.current;
      el.play().catch((err) => console.log("Video playback error:", err));
    }
  }, []);

  const startPhotoCamera = async (facing: "environment" | "user" = photoCameraFacing) => {
    stopPhotoCamera();
    setIsPhotoCameraActive(true);
    setPhotoCameraLoading(true);
    try {
      const stream = await getCameraStream(facing);
      photoStreamRef.current = stream;
      if (photoVideoRef.current) {
        photoVideoRef.current.srcObject = stream;
        photoVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error("Job photo camera error:", err);
      alert(err.message || "Unable to access camera.");
      setIsPhotoCameraActive(false);
    } finally {
      setPhotoCameraLoading(false);
    }
  };

  const stopPhotoCamera = () => {
    if (photoStreamRef.current) {
      stopCameraStream(photoStreamRef.current);
      photoStreamRef.current = null;
    }
    if (photoVideoRef.current) {
      photoVideoRef.current.srcObject = null;
    }
    setIsPhotoCameraActive(false);
    setPhotoCameraLoading(false);
  };

  const snapPhotoSnapshot = async () => {
    const video = photoVideoRef.current;
    if (!video) return;
    try {
      const { file, dataUrl } = await captureVideoFrame(
        video,
        `job_${jobId}_${photoStage.toLowerCase()}`
      );
      setPhotoFile(file);
      setPhotoPreview(dataUrl);
      stopPhotoCamera();
    } catch (err: any) {
      alert("Failed to snap photo: " + err.message);
      stopPhotoCamera();
    }
  };

  const openPhotoModal = (stage: "BEFORE" | "AFTER" = "BEFORE") => {
    stopPhotoCamera();
    setPhotoStage(stage);
    setPhotoTitle("");
    setPhotoWorkDesc("");
    setPhotoFile(null);
    setPhotoPreview(null);
    if (currentUser?.id) {
      setPhotoPerformedById(String(currentUser.id));
    }
    if (job?.department_id) {
      setPhotoDeptId(String(job.department_id));
    }
    setShowPhotoModal(true);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) {
      alert("Please select a valve photo to upload.");
      return;
    }
    if (!photoWorkDesc.trim()) {
      alert("Please describe the work done or observed condition on the valve.");
      return;
    }

    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("stage", photoStage);
      if (photoTitle) formData.append("title", photoTitle);
      formData.append("work_description", photoWorkDesc);

      if (photoPerformedById) {
        formData.append("performed_by_id", photoPerformedById);
        const u = availableUsers.find((user: any) => String(user.id) === photoPerformedById);
        if (u) formData.append("performed_by_name", u.full_name);
      } else if (currentUser) {
        formData.append("performed_by_id", String(currentUser.id));
        formData.append("performed_by_name", currentUser.full_name);
      }

      if (photoDeptId) {
        formData.append("department_id", photoDeptId);
        const d = availableDepts.find((dept: any) => String(dept.id) === photoDeptId);
        if (d) formData.append("department_name", d.name);
      } else if (job?.department_name) {
        formData.append("department_name", job.department_name);
      }

      await api.uploadValvePhoto(jobId, formData);
      setShowPhotoModal(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoTitle("");
      setPhotoWorkDesc("");
      fetchJob();
    } catch (err: any) {
      alert("Failed to upload valve photo: " + err.message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm("Are you sure you want to permanently delete this photographic record?")) return;
    try {
      await api.deleteValvePhoto(photoId);
      if (lightboxPhoto?.id === photoId) setLightboxPhoto(null);
      fetchJob();
    } catch (err: any) {
      alert("Failed to delete photo: " + err.message);
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusUpdating(true);
    try {
      await api.updateJobStatus(jobId, newStatus, statusReason);
      setShowStatusModal(false);
      setStatusReason("");
      fetchJob();
    } catch (err: any) {
      alert("Status update failed: " + err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddWorkEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalCategories = [...selectedWorkCategories];
    if (customWorkCategory.trim() && !finalCategories.includes(customWorkCategory.trim())) {
      finalCategories.push(customWorkCategory.trim());
    }
    if (finalCategories.length === 0) {
      alert("Please select or enter at least one operation category.");
      return;
    }
    try {
      await api.addWorkEntry(jobId, {
        operation_type: finalCategories[0],
        operation_categories: finalCategories.join(", "),
        details: opDetails,
        hours_spent: Number(opHours),
      });
      setShowWorkModal(false);
      setOpDetails("");
      setSelectedWorkCategories(["Seat reclamation"]);
      setCustomWorkCategory("");
      fetchJob();
    } catch (err: any) {
      alert("Failed to add work entry: " + err.message);
    }
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addPressureTest(jobId, {
        test_category: testCat,
        test_method: testMethod,
        test_pressure: Number(testPress),
        pressure_unit: testUnit,
        actual_result: testResult,
      });
      setShowTestModal(false);
      fetchJob();
    } catch (err: any) {
      alert("Failed to record pressure test: " + err.message);
    }
  };

  const handleCreateCertificate = async () => {
    try {
      const cert = await api.createCertificateFromJob(jobId);
      router.push(`/certificates/editor/${cert.id}`);
    } catch (err: any) {
      alert("Failed to create certificate: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className="text-xs uppercase tracking-wider font-mono">Loading valve record...</span>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="p-6 bg-white border border-rose-200 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Reclamation Record Error</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{error || "Valve record could not be found."}</p>
          <div className="pt-2">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Back to Master Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const latestCert = job.certificates && job.certificates.length > 0 ? job.certificates[job.certificates.length - 1] : null;
  const allPhotos = job.photos || [];
  const beforePhotos = allPhotos.filter((p: any) => p.stage === "BEFORE");
  const afterPhotos = allPhotos.filter((p: any) => p.stage === "AFTER");
  const displayedPhotos =
    photoFilter === "BEFORE"
      ? beforePhotos
      : photoFilter === "AFTER"
      ? afterPhotos
      : allPhotos;

  // Calculate current workflow step index
  const currentStepIdx = WORKFLOW_STEPS.findIndex((s) => s.key === job.status);

  return (
    <div className="space-y-6">
      {/* Top Header / Breadcrumb Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 font-mono">
            <Link href="/jobs" className="hover:text-slate-900 transition-colors">
              Reclamation Register
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-emerald-700 font-bold">{job.tracking_id}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-950 tracking-tight">
              {job.valve_description}
            </h1>

            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono uppercase bg-slate-900 text-white tracking-wide">
              {job.status.replace(/_/g, " ")}
            </span>

            {job.priority === "EMERGENCY" && (
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold font-mono uppercase bg-rose-600 text-white animate-pulse flex items-center gap-1">
                🚨 EMERGENCY
              </span>
            )}
            {job.priority === "URGENT" && (
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold font-mono uppercase bg-amber-500 text-white flex items-center gap-1">
                ⚡ URGENT
              </span>
            )}
            {job.priority === "HIGH" && (
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold font-mono uppercase bg-orange-100 text-orange-800 border border-orange-200">
                HIGH PRIORITY
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/jobs/edit/${job.id}`}
            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <FileEdit className="w-3.5 h-3.5 text-slate-500" />
            Edit Valve
          </Link>

          <button
            onClick={() => setShowStatusModal(true)}
            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Update Status
          </button>

          {latestCert ? (
            <Link
              href={`/certificates/editor/${latestCert.id}`}
              className="px-3.5 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-500 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Award className="w-3.5 h-3.5" />
              Certificate ({latestCert.certificate_number})
            </Link>
          ) : (
            <button
              onClick={handleCreateCertificate}
              className="px-3.5 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-500 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Award className="w-3.5 h-3.5" />
              Generate Certificate
            </button>
          )}

          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
            title="Delete reclamation record"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Emergency Notification Banner */}
      {job.priority === "EMERGENCY" && (
        <div className="bg-rose-50 border border-rose-300 rounded-lg p-3.5 flex items-center justify-between text-rose-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0 text-rose-700 font-bold">
              !
            </div>
            <div>
              <span className="font-bold text-xs uppercase tracking-wide block">
                Critical Emergency Reclamation Request
              </span>
              <span className="text-[11px] text-rose-700">
                This unit is flagged for emergency priority. Expedite dismantling, machining, hydro testing, and Form QF-003-05-307 certification.
              </span>
            </div>
          </div>
          <span className="bg-rose-600 text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded uppercase tracking-wider shrink-0">
            Immediate Action
          </span>
        </div>
      )}

      {/* Clean Workflow Pipeline Stepper */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 overflow-x-auto shadow-2xs">
        <div className="flex items-center justify-between min-w-[700px] text-xs">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isCompleted = currentStepIdx > idx || job.status === "DELIVERED";
            const isCurrent = job.status === step.key;

            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-colors ${
                      isCurrent
                        ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                        : isCompleted
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>
                  <span
                    className={`whitespace-nowrap font-medium text-[11px] ${
                      isCurrent
                        ? "text-slate-950 font-bold"
                        : isCompleted
                        ? "text-slate-700"
                        : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <div
                    className={`h-[1px] flex-1 mx-3 ${
                      isCompleted ? "bg-slate-900" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Metadata, Visual Evidence, Operations, Tests */}
        <div className="lg:col-span-2 space-y-6">
          {/* Technical Metadata Panel */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Technical & Engineering Specs
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Created: {new Date(job.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Tracking ID</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">{job.tracking_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Plant / Source</span>
                <span className="font-semibold text-slate-800">
                  {job.source === "EXTERNAL" ? "External Customer" : `${job.plant_name || "—"} (${job.plant_code || ""})`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Department / Plant Area</span>
                <span className="font-semibold text-slate-800">{job.department_name || "Fabrication"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Notification / WO #</span>
                <span className="font-mono text-slate-800 font-semibold">{job.notification_no || job.work_order_ref || "—"}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Tag Number</span>
                <span className="font-mono text-slate-800 font-medium">{job.valve_tag_no || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Serial Number</span>
                <span className="font-mono text-slate-800 font-medium">{job.valve_serial_no || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Size & Pressure Class</span>
                <span className="font-semibold text-slate-900">{job.size || ""} {job.pressure_rating || ""}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Quantity</span>
                <span className="font-semibold text-slate-900">{job.valve_quantity} unit(s)</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Material</span>
                <span className="text-slate-700">{job.valve_material || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Manufacturer</span>
                <span className="text-slate-700">{job.manufacturer || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Priority</span>
                <span className="font-semibold text-slate-800">{job.priority || "Normal"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Location</span>
                <span className="text-slate-700 font-mono text-[11px]">{job.location_in_plant || "Goth Machhi"}</span>
              </div>
            </div>

            {/* Applicable Operation Categories */}
            {job.operation_categories && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
                  Allocated Operation Categories
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {job.operation_categories.split(",").map((cat: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-900 border border-emerald-200"
                    >
                      {cat.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.general_remarks && (
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">General Remarks</span>
                <p className="text-slate-700 mt-0.5 leading-relaxed">{job.general_remarks}</p>
              </div>
            )}
          </div>

          {/* Photographic Evidence & Inspection Observations */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  Visual Work Evidence ({allPhotos.length})
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Permanent Before & After photographic records for QA inspection and certificate verification.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openPhotoModal("BEFORE")}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-700" />
                  + Before Work
                </button>
                <button
                  type="button"
                  onClick={() => openPhotoModal("AFTER")}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  + After Reclamation
                </button>
              </div>
            </div>

            {/* Dismantling & Inspection Observations Strip */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
                  Dismantling & Inspection Findings
                </span>
                <button
                  type="button"
                  onClick={openInspectionModal}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  {job.inspections && job.inspections.length > 0 ? "Edit Findings" : "+ Record Findings"}
                </button>
              </div>

              {job.inspections && job.inspections.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase">Problem Reported</span>
                    <span className="text-slate-800 font-medium">
                      {job.inspections[job.inspections.length - 1].reported_problem || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase">Observed Fault</span>
                    <span className="text-slate-800 font-medium">
                      {job.inspections[job.inspections.length - 1].observed_damage || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase">Initial Condition</span>
                    <span className="text-slate-800 font-medium">
                      {job.inspections[job.inspections.length - 1].initial_condition || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase">Recommended Scope</span>
                    <span className="text-slate-800 font-medium">
                      {job.inspections[job.inspections.length - 1].recommended_work || "—"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  No initial inspection findings recorded yet. Click "Record Findings" to log internal wear, seat scoring, or cavitation before starting reclamation.
                </p>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPhotoFilter("ALL")}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    photoFilter === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({allPhotos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoFilter("BEFORE")}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    photoFilter === "BEFORE"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  Before Dismantling ({beforePhotos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoFilter("AFTER")}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    photoFilter === "AFTER"
                      ? "bg-emerald-700 text-white"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  After Reclamation ({afterPhotos.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPhotoFilter(photoFilter === "COMPARISON" ? "ALL" : "COMPARISON")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  photoFilter === "COMPARISON"
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                {photoFilter === "COMPARISON" ? "Standard View" : "Side-by-Side"}
              </button>
            </div>

            {/* Photos Grid or Empty State */}
            {allPhotos.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-lg space-y-2">
                <Camera className="w-6 h-6 mx-auto text-slate-400" />
                <p className="text-xs font-semibold text-slate-700">No Photographic Evidence Logged</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Upload photos taken during initial receipt/dismantling and upon finishing reclamation.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => openPhotoModal("BEFORE")}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition-colors"
                  >
                    + Upload First Photo
                  </button>
                </div>
              </div>
            ) : photoFilter === "COMPARISON" ? (
              /* Side-by-Side Split View */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Column: Before */}
                <div className="space-y-3 bg-amber-50/40 p-3 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                      Before Dismantling ({beforePhotos.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => openPhotoModal("BEFORE")}
                      className="text-[11px] text-amber-800 hover:underline font-semibold"
                    >
                      + Add
                    </button>
                  </div>

                  {beforePhotos.length === 0 ? (
                    <p className="text-xs text-amber-700/60 italic py-4 text-center">No before photos logged.</p>
                  ) : (
                    <div className="space-y-3">
                      {beforePhotos.map((p: any) => (
                        <div key={p.id} className="bg-white rounded-lg border border-amber-200 overflow-hidden shadow-2xs">
                          <div className="relative group cursor-pointer" onClick={() => setLightboxPhoto(p)}>
                            <img
                              src={p.image_data_url || api.getPhotoUrl(p.id)}
                              alt={p.title || "Before photo"}
                              className="w-full h-40 object-cover group-hover:opacity-95 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                              <ZoomIn className="w-4 h-4" /> Inspect
                            </div>
                          </div>
                          <div className="p-3 space-y-1.5 text-xs">
                            <p className="text-slate-700 text-[11px] leading-relaxed">
                              {p.work_description}
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                              <span>{p.performed_by_name || "Technician"}</span>
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(p.id)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Column: After */}
                <div className="space-y-3 bg-emerald-50/40 p-3 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">
                      After Reclamation ({afterPhotos.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => openPhotoModal("AFTER")}
                      className="text-[11px] text-emerald-800 hover:underline font-semibold"
                    >
                      + Add
                    </button>
                  </div>

                  {afterPhotos.length === 0 ? (
                    <p className="text-xs text-emerald-700/60 italic py-4 text-center">No after photos logged.</p>
                  ) : (
                    <div className="space-y-3">
                      {afterPhotos.map((p: any) => (
                        <div key={p.id} className="bg-white rounded-lg border border-emerald-200 overflow-hidden shadow-2xs">
                          <div className="relative group cursor-pointer" onClick={() => setLightboxPhoto(p)}>
                            <img
                              src={p.image_data_url || api.getPhotoUrl(p.id)}
                              alt={p.title || "After photo"}
                              className="w-full h-40 object-cover group-hover:opacity-95 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                              <ZoomIn className="w-4 h-4" /> Inspect
                            </div>
                          </div>
                          <div className="p-3 space-y-1.5 text-xs">
                            <p className="text-slate-700 text-[11px] leading-relaxed">
                              {p.work_description}
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                              <span>{p.performed_by_name || "Technician"}</span>
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(p.id)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Standard Gallery Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {displayedPhotos.map((p: any) => {
                  const isBefore = p.stage === "BEFORE";
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs hover:border-slate-300 transition-colors"
                    >
                      <div className="relative group cursor-pointer bg-slate-950" onClick={() => setLightboxPhoto(p)}>
                        <img
                          src={p.image_data_url || api.getPhotoUrl(p.id)}
                          alt={p.title || "Valve photo"}
                          className="w-full h-44 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                          <ZoomIn className="w-4 h-4" /> Enlarge
                        </div>
                        <span
                          className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isBefore ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
                          }`}
                        >
                          {isBefore ? "Before Dismantling" : "After Reclamation"}
                        </span>
                      </div>

                      <div className="p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {p.title || (isBefore ? "Initial State" : "Finished State")}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(p.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-slate-700 text-[11px] leading-relaxed">
                          {p.work_description}
                        </p>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{p.performed_by_name || "Technician"} · {p.department_name || "Fab Shop"}</span>
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(p.id)}
                            className="text-slate-400 hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reclamation Operations / Work Entries */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-600" />
                Reclamation Work Operations ({job.work_entries?.length || 0})
              </span>
              <button
                onClick={() => setShowWorkModal(true)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Operation
              </button>
            </div>

            {(!job.work_entries || job.work_entries.length === 0) ? (
              <p className="text-xs text-slate-400 italic py-2">No reclamation operations logged yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {job.work_entries.map((w: any) => (
                  <div key={w.id} className="py-3 first:pt-0 last:pb-0 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{w.operation_type}</span>
                      <span className="text-[11px] font-mono text-slate-500">{w.operation_date} · {w.hours_spent}h</span>
                    </div>
                    {w.operation_categories && (
                      <div className="flex flex-wrap gap-1 py-0.5">
                        {w.operation_categories.split(",").map((c: string, idx: number) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                            {c.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-slate-600 leading-relaxed text-[11px]">{w.details}</p>
                    <span className="text-[10px] text-slate-400 block">Logged by: {w.technician_name || "Assigned staff"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pressure & Quality Testing Records */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Hydrostatic & Pneumatic Test Log ({job.tests?.length || 0})
              </span>
              <button
                onClick={() => setShowTestModal(true)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Record Test
              </button>
            </div>

            {(!job.tests || job.tests.length === 0) ? (
              <p className="text-xs text-slate-400 italic py-2">No pressure testing records logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-mono">
                      <th className="py-2">Test Type</th>
                      <th className="py-2">Medium</th>
                      <th className="py-2">Pressure</th>
                      <th className="py-2">Outcome</th>
                      <th className="py-2">Inspector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {job.tests.map((t: any) => (
                      <tr key={t.id}>
                        <td className="py-2.5 font-semibold text-slate-800">{t.test_category.replace(/_/g, " ")}</td>
                        <td className="py-2.5 text-slate-600">{t.test_method}</td>
                        <td className="py-2.5 font-mono font-bold text-slate-900">{t.test_pressure} {t.pressure_unit}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                              t.actual_result === "PASS"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {t.actual_result}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-500">{t.inspector_name || "Inspector"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Certificate Box & Status History */}
        <div className="space-y-6">
          {/* Certificate Quick Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-2xs">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              FFC Test Certificate
            </span>

            {latestCert ? (
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-900 text-sm">
                    {latestCert.certificate_number}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-600 text-white uppercase">
                    {latestCert.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-mono">
                  Rev: {latestCert.revision_number} · Form: QF-003-05-307
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <Link
                    href={`/certificates/editor/${latestCert.id}`}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-center rounded text-xs font-semibold transition-colors"
                  >
                    Open Certificate Editor
                  </Link>
                  <a
                    href={`http://127.0.0.1:8000/api/certificates/${latestCert.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-white border border-emerald-300 text-emerald-700 rounded hover:bg-emerald-50 transition-colors"
                    title="Download Official PDF"
                  >
                    <FileText className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-5 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs space-y-2">
                <Award className="w-6 h-6 mx-auto text-slate-400" />
                <p className="text-slate-600 font-medium">No certificate created for this valve.</p>
                <div className="pt-1">
                  <button
                    onClick={handleCreateCertificate}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-500 transition-colors"
                  >
                    Generate Certificate Draft
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Workflow Status Audit Trail */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-2xs">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Status Audit Trail
            </span>

            <div className="relative pl-4 border-l border-slate-200 space-y-4 text-xs">
              {job.status_history?.map((h: any) => (
                <div key={h.id} className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                  <div>
                    <span className="font-semibold text-slate-900 block text-xs">
                      {h.new_status.replace(/_/g, " ")}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                      {new Date(h.timestamp).toLocaleString()}
                    </span>
                    {h.reason && <p className="text-slate-600 text-[11px] mt-1 italic">"{h.reason}"</p>}
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Updated by {h.changed_by_name || "Authorized staff"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Reclamation Record"
        message={`Are you sure you want to delete reclamation entry ${job.tracking_id} (${job.valve_description})? All associated work entries, tests, and photographic records will be removed.`}
        confirmLabel={deleting ? "Deleting..." : "Permanently Delete"}
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDeleteJob}
        onClose={() => setShowDeleteModal(false)}
      />

      {/* Modal: Update Status */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Transition Reclamation Status
            </h3>
            <form onSubmit={handleStatusChange} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">New Workflow Stage</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="RECEIVED">Received</option>
                  <option value="REGISTERED">Registered</option>
                  <option value="INSPECTION_IN_PROGRESS">Inspection in Progress</option>
                  <option value="AWAITING_APPROVAL_PARTS">Awaiting Approval / Parts</option>
                  <option value="RECLAMATION_IN_PROGRESS">Reclamation in Progress</option>
                  <option value="TESTING_QUALITY_INSPECTION">Testing / QA Inspection</option>
                  <option value="REWORK_REQUIRED">Rework Required</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CERTIFICATE_ISSUED">Certificate Issued</option>
                  <option value="READY_FOR_DELIVERY">Ready for Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason / Technical Remarks</label>
                <textarea
                  rows={2}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Machining operations complete, moving to hydro testing"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusUpdating}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
                >
                  {statusUpdating ? "Updating..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Work Entry */}
      {showWorkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 my-8 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-600" />
                Record Reclamation Work Operation
              </h3>
              <button
                type="button"
                onClick={() => setShowWorkModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWorkEntry} className="space-y-4 text-xs">
              {/* Multi-Select Operation Categories */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Operation Categories <span className="text-rose-500">*</span>
                  <span className="text-slate-400 font-normal ml-1">(Select multiple or add custom)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded">
                  {WORK_OPERATION_CATEGORIES.map((cat) => {
                    const isChecked = selectedWorkCategories.includes(cat);
                    return (
                      <label
                        key={cat}
                        className={`flex items-center gap-2 p-1.5 rounded text-[11px] cursor-pointer transition-colors border ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-medium"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleWorkCategory(cat)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="truncate">{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Other / Custom Operation */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Other / Custom Operation
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Ultrasonic cleaning, NDT testing"
                    value={customWorkCategory}
                    onChange={(e) => setCustomWorkCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomWorkCategory();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomWorkCategory}
                    disabled={!customWorkCategory.trim()}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded text-xs font-semibold shrink-0"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Selected Categories Summary Badges */}
              {selectedWorkCategories.length > 0 && (
                <div>
                  <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Selected Operations ({selectedWorkCategories.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedWorkCategories.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => toggleWorkCategory(c)}
                          className="text-emerald-700 hover:text-rose-600 font-bold ml-0.5"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Work Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={opDetails}
                  onChange={(e) => setOpDetails(e.target.value)}
                  placeholder="e.g. Stellited body seat with Stellite #6 alloy, precision turned on lathe, lapped to mirror finish."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Hours Spent</label>
                <input
                  type="number"
                  step="0.5"
                  value={opHours}
                  onChange={(e) => setOpHours(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWorkModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-xs"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Pressure Test */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Record Pressure Test</h3>
            <form onSubmit={handleAddTest} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Test Category</label>
                <select
                  value={testCat}
                  onChange={(e) => setTestCat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="SEAT_TEST_US">Seat Test U/S (Upstream)</option>
                  <option value="SEAT_TEST_DS">Seat Test D/S (Downstream)</option>
                  <option value="BODY_TEST">Body Hydrostatic Test</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Method</label>
                  <select
                    value={testMethod}
                    onChange={(e) => setTestMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="HYDRAULIC">Hydraulic</option>
                    <option value="PNEUMATIC">Pneumatic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Result</label>
                  <select
                    value={testResult}
                    onChange={(e) => setTestResult(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 bg-white font-semibold"
                  >
                    <option value="PASS">PASS (Zero Leakage)</option>
                    <option value="FAIL">FAIL (Leaking)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Test Pressure</label>
                  <input
                    type="number"
                    value={testPress}
                    onChange={(e) => setTestPress(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    value={testUnit}
                    onChange={(e) => setTestUnit(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-xs"
                >
                  Save Test Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Valve Photo Evidence */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 my-8 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Log Valve Photo Evidence
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Capture valve condition before dismantling or after reclamation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopPhotoCamera();
                  setShowPhotoModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadPhoto} className="space-y-4 text-xs">
              {/* Stage Selector */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Reclamation Stage <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPhotoStage("BEFORE")}
                    className={`py-2 px-3 rounded border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      photoStage === "BEFORE"
                        ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    BEFORE Dismantling
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoStage("AFTER")}
                    className={`py-2 px-3 rounded border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      photoStage === "AFTER"
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    AFTER Reclamation
                  </button>
                </div>
              </div>

              {/* File Upload & Live Camera */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Valve Picture <span className="text-rose-500">*</span>
                </label>

                {isPhotoCameraActive ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3] flex items-center justify-center">
                      <video
                        ref={setPhotoVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE CAMERA
                      </div>
                      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={snapPhotoSnapshot}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-full shadow-lg flex items-center gap-1.5 transition-all"
                        >
                          <Camera className="w-4 h-4" /> Snap Photo
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={stopPhotoCamera}
                        className="text-xs text-rose-600 font-semibold hover:underline"
                      >
                        Cancel Camera
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="file"
                      id="jobDetailPhotoInput"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="sr-only"
                    />

                    {!photoPreview ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById("jobDetailPhotoInput") as HTMLInputElement;
                            if (el) el.click();
                          }}
                          className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold transition-colors cursor-pointer text-center shadow-2xs flex items-center justify-center gap-1.5 active:scale-98"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                          <span>🖼️ Choose from Gallery</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => startPhotoCamera("environment")}
                          className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5 text-emerald-400" /> Use Live Camera
                        </button>
                      </div>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center max-h-48">
                        <img
                          src={photoPreview}
                          alt="Upload preview"
                          className="max-h-48 object-contain mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                            const input = document.getElementById("jobDetailPhotoInput") as HTMLInputElement;
                            if (input) input.value = "";
                          }}
                          className="absolute top-2 right-2 bg-black/70 hover:bg-rose-600 text-white p-1 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Photo Title */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Subject / Area Title (Optional)
                </label>
                <input
                  type="text"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  placeholder="e.g. Body Cavity & Upstream Seat Ring"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Work Done / Condition Description */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {photoStage === "BEFORE"
                    ? "Dismantling Observations & Problem Identified"
                    : "Reclamation Work Executed & Final Quality Findings"} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={photoWorkDesc}
                  onChange={(e) => setPhotoWorkDesc(e.target.value)}
                  placeholder={
                    photoStage === "BEFORE"
                      ? "e.g. Dismantled valve body. Observed deep cavitation pitting on upstream seat ring."
                      : "e.g. Stellited body seat using Stellite #6 alloy, precision turned on lathe, lapped to mirror finish."
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 leading-relaxed"
                />
              </div>

              {/* User & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Done / Logged By
                  </label>
                  <select
                    value={photoPerformedById}
                    onChange={(e) => setPhotoPerformedById(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="">Select Technician...</option>
                    {availableUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Department
                  </label>
                  <select
                    value={photoDeptId}
                    onChange={(e) => setPhotoDeptId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="">Fabrication Shop (Default)</option>
                    {availableDepts.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    stopPhotoCamera();
                    setShowPhotoModal(false);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={photoUploading}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                >
                  {photoUploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Save Photo Evidence
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fullscreen Lightbox / Zoom View */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] border border-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                    lightboxPhoto.stage === "BEFORE"
                      ? "bg-amber-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {lightboxPhoto.stage === "BEFORE" ? "Before Dismantling" : "After Reclamation"}
                </span>
                <h3 className="font-bold text-sm text-slate-100">
                  {lightboxPhoto.title || "Valve Photo Evidence"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-black flex items-center justify-center p-4 overflow-hidden min-h-[300px]">
              <img
                src={lightboxPhoto.image_data_url || api.getPhotoUrl(lightboxPhoto.id)}
                alt={lightboxPhoto.title || "Valve photo"}
                className="max-h-[60vh] max-w-full object-contain rounded"
              />
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2 text-xs">
              <div className="bg-slate-900 p-3 rounded border border-slate-800">
                <span className="text-slate-400 font-semibold block mb-0.5 text-[11px] font-mono uppercase">
                  {lightboxPhoto.stage === "BEFORE" ? "Observed Condition: " : "Reclamation Executed: "}
                </span>
                <p className="text-slate-200 leading-relaxed">{lightboxPhoto.work_description}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                <div className="flex items-center gap-3 font-mono">
                  <span>{lightboxPhoto.performed_by_name || "Technician"}</span>
                  <span>·</span>
                  <span>{lightboxPhoto.department_name || "Fab Shop"}</span>
                  <span>·</span>
                  <span>{new Date(lightboxPhoto.created_at).toLocaleString()}</span>
                </div>

                <a
                  href={api.getPhotoUrl(lightboxPhoto.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Full Resolution
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Inspection Observations */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Initial Dismantling Observations
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Document initial valve condition, reported faults, and observed damage upon disassembly
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInspectionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInspection} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reported Problem / Leakage
                </label>
                <textarea
                  rows={2}
                  value={inspProblem}
                  onChange={(e) => setInspProblem(e.target.value)}
                  placeholder="e.g. Severe internal seat passing during operation..."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Observed Damage / Fault
                </label>
                <textarea
                  rows={2}
                  value={inspDamage}
                  onChange={(e) => setInspDamage(e.target.value)}
                  placeholder="e.g. Body seat scored, disc guide worn by 0.5mm, gland packing calcified..."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Initial Condition
                  </label>
                  <select
                    value={inspCondition}
                    onChange={(e) => setInspCondition(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 bg-white font-medium"
                  >
                    <option value="Worn / Passing">Worn / Passing</option>
                    <option value="Seized / Stuck">Seized / Stuck</option>
                    <option value="Severe Internal Damage">Severe Internal Damage</option>
                    <option value="Cavitation Damage">Cavitation Damage</option>
                    <option value="Corroded / Scaled">Corroded / Scaled</option>
                    <option value="Normal Wear">Normal Wear</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Recommended Scope
                  </label>
                  <input
                    type="text"
                    value={inspScope}
                    onChange={(e) => setInspScope(e.target.value)}
                    placeholder="e.g. Stelliting, machining, lapping..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInspectionModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inspSaving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded shadow-xs"
                >
                  {inspSaving ? "Saving..." : "Save Observations"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
