"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Camera,
  UploadCloud,
  Filter,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Clock,
  User as UserIcon,
  ArrowRight,
  Maximize2,
  X,
  Building2,
  RefreshCw,
  Trash2,
  Video,
  Layers,
  Search
} from "lucide-react";
import { api, getStoredUser } from "@/lib/api";
import { getCameraStream, stopCameraStream, captureVideoFrame } from "@/lib/camera";
import PageHeader from "@/components/PageHeader";
import ConfirmModal from "@/components/ConfirmModal";
import { registerCloseHandler } from "@/lib/modalRegistry";

export default function ValvePhotosGalleryPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [plantFilter, setPlantFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State for Image Lightbox
  const [activeModalPhoto, setActiveModalPhoto] = useState<any | null>(null);

  // Delete Confirm Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [uploadJobId, setUploadJobId] = useState<string>("");
  const [uploadStage, setUploadStage] = useState<string>("BEFORE");
  const [uploadCaption, setUploadCaption] = useState<string>("");
  const [uploadWorkDone, setUploadWorkDone] = useState<string>("");
  const [uploadTechId, setUploadTechId] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);

  // Live Camera inside Upload Modal
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch((err) => console.log("Video playback error:", err));
    }
  }, []);

  const currentUser = getStoredUser();

  const fetchPhotos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllValvePhotos();
      setPhotos(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to load valve photos:", err);
      setError(err?.message || "Failed to load photos repository.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const openUploadModal = async () => {
    setShowUploadModal(true);
    setUploadError(null);
    try {
      const [jobsData, usersData] = await Promise.all([
        api.getJobs({ limit: 150 }).catch(() => ({ items: [] })),
        api.getUsers().catch(() => []),
      ]);
      const jobItems = jobsData.items || (Array.isArray(jobsData) ? jobsData : []);
      setJobs(jobItems);
      setUsers(Array.isArray(usersData) ? usersData : []);

      if (jobItems.length > 0 && !uploadJobId) {
        setUploadJobId(String(jobItems[0].id));
      }
      if (currentUser && !uploadTechId) {
        setUploadTechId(String(currentUser.id));
      }
    } catch (err) {
      console.error("Failed to load reference data for photo upload:", err);
    }
  };

  const closeUploadModal = () => {
    stopCamera();
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadPreview("");
    setUploadCaption("");
    setUploadWorkDone("");
    setUploadError(null);
  };

  // Register modals with modalRegistry for native back button dismissal
  useEffect(() => {
    if (!activeModalPhoto) return;
    const unregister = registerCloseHandler("photoLightbox", () => setActiveModalPhoto(null), 25);
    return unregister;
  }, [activeModalPhoto]);

  useEffect(() => {
    if (!showUploadModal) return;
    const unregister = registerCloseHandler("photoUploadModal", closeUploadModal, 20);
    return unregister;
  }, [showUploadModal]);

  useEffect(() => {
    if (!isCameraActive) return;
    const unregister = registerCloseHandler("photoCamera", stopCamera, 30);
    return unregister;
  }, [isCameraActive]);

  // Camera Management
  const startCamera = async (facing: "environment" | "user" = cameraFacing) => {
    stopCamera();
    setIsCameraActive(true);
    setCameraLoading(true);
    setUploadError(null);

    try {
      const stream = await getCameraStream(facing);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setUploadError(err?.message || "Unable to access device camera. Please check camera permissions.");
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

  const toggleCameraFacing = () => {
    const next = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(next);
    startCamera(next);
  };

  const snapPhoto = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const { file, dataUrl } = await captureVideoFrame(
        video,
        `valve_${uploadStage.toLowerCase()}`
      );
      setUploadFile(file);
      setUploadPreview(dataUrl);
      stopCamera();
    } catch (err: any) {
      setUploadError(err.message || "Failed to capture snapshot from camera.");
    }
  };

  const handleFileChange = (fileObj: File) => {
    if (!fileObj) return;
    setUploadFile(fileObj);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(fileObj);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadJobId) {
      setUploadError("Please select an associated reclamation job.");
      return;
    }
    if (!uploadFile) {
      setUploadError("Please snap or select a valve picture.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const data = new FormData();
      data.append("file", uploadFile);
      data.append("photo_stage", uploadStage);
      data.append("stage", uploadStage);
      if (uploadCaption) data.append("caption", uploadCaption);
      if (uploadWorkDone) data.append("work_done_notes", uploadWorkDone);

      // Add technician details
      if (uploadTechId) {
        data.append("performed_by_id", uploadTechId);
        const tech = users.find((u) => String(u.id) === uploadTechId);
        if (tech) data.append("performed_by_name", tech.full_name);
      } else if (currentUser) {
        data.append("performed_by_id", String(currentUser.id));
        data.append("performed_by_name", currentUser.full_name);
      }

      // Add department details from job
      const selectedJob = jobs.find((j) => String(j.id) === uploadJobId);
      if (selectedJob?.department_id) {
        data.append("department_id", String(selectedJob.department_id));
      }
      if (selectedJob?.department_name || selectedJob?.department?.name) {
        data.append("department_name", selectedJob.department_name || selectedJob.department?.name);
      }

      await api.uploadValvePhoto(Number(uploadJobId), data);

      closeUploadModal();
      fetchPhotos();
    } catch (err: any) {
      console.error("Failed to upload valve photo:", err);
      setUploadError(err?.message || "Upload failed. Please check file format and size.");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await api.deleteValvePhoto(deleteTargetId);
      if (activeModalPhoto?.id === deleteTargetId) setActiveModalPhoto(null);
      setPhotos((prev) => prev.filter((p) => p.id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch (err: any) {
      alert("Failed to delete photo: " + (err?.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  // Filtered List
  const filteredPhotos = photos.filter((p) => {
    const stage = (p.stage || p.photo_stage || "").toUpperCase();
    if (stageFilter !== "ALL" && stage !== stageFilter) return false;

    const source = p.job_source || p.job?.source || "";
    if (plantFilter !== "ALL" && source !== plantFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTrack = (p.tracking_id || p.job?.tracking_id || "").toLowerCase().includes(q);
      const matchDesc = (p.valve_description || p.job?.valve_description || "").toLowerCase().includes(q);
      const matchTag = (p.valve_tag_no || p.job?.valve_tag_no || "").toLowerCase().includes(q);
      const matchCap = (p.title || p.caption || "").toLowerCase().includes(q);
      const matchWork = (p.work_description || p.work_done_notes || "").toLowerCase().includes(q);
      const matchTech = (p.performed_by_name || "").toLowerCase().includes(q);
      const matchDept = (p.department_name || "").toLowerCase().includes(q);

      if (!matchTrack && !matchDesc && !matchTag && !matchCap && !matchWork && !matchTech && !matchDept) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Valve Photos & Visual Evidence"
        description="Permanent photographic audit trail of valve condition before dismantling and after reclamation."
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded">
            {photos.length} Records
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPhotos}
              className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Refresh repository"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={openUploadModal}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" /> Upload Photo
            </button>
          </div>
        }
      />

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Strip */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Stage Filter Chips */}
        <div className="flex items-center gap-1 w-full md:w-auto text-xs">
          {[
            { key: "ALL", label: `All (${photos.length})` },
            { key: "BEFORE", label: "Before Dismantling" },
            { key: "AFTER", label: "After Reclamation" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStageFilter(tab.key)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                stageFilter === tab.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Source Dropdown & Search Input */}
        <div className="flex items-center gap-2 w-full md:w-auto text-xs">
          <select
            value={plantFilter}
            onChange={(e) => setPlantFilter(e.target.value)}
            className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All Plants</option>
            <option value="PLANT_1">Plant 1 (FFC)</option>
            <option value="PLANT_2">Plant 2 (FFC)</option>
            <option value="EXTERNAL">External</option>
          </select>

          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoComplete="off"
              aria-label="Search tracking, tag"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-slate-300 rounded pl-8 pr-3 py-1.5 w-full focus:outline-none focus:border-emerald-600 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Photos Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
          <p className="text-xs font-mono uppercase tracking-wider">Loading evidence archive...</p>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-lg border border-dashed border-slate-200 p-8 space-y-2">
          <Camera className="w-8 h-8 mx-auto text-slate-300" />
          <h3 className="text-xs font-bold text-slate-800">No Photographic Evidence Found</h3>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            No photos match your current filter settings. Click below to add an initial or completed valve photograph.
          </p>
          <div className="pt-2">
            <button
              onClick={openUploadModal}
              className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Upload First Photo
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => {
            const stage = (photo.stage || photo.photo_stage || "BEFORE").toUpperCase();
            const isBefore = stage === "BEFORE";
            const imgSrc = photo.image_data_url || api.getPhotoUrl(photo.id);
            const trackingId = photo.tracking_id || photo.job?.tracking_id || `Job #${photo.job_id}`;
            const valveDesc = photo.valve_description || photo.job?.valve_description || "Industrial Valve";
            const valveTag = photo.valve_tag_no || photo.job?.valve_tag_no;
            const techName = photo.performed_by_name || photo.performed_by?.full_name || "Workshop Staff";
            const deptName = photo.department_name || photo.department?.name || "Fabrication Shop";
            const workNotes = photo.work_description || photo.work_done_notes;

            return (
              <div
                key={photo.id}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs hover:border-slate-300 transition-colors flex flex-col group"
              >
                {/* Photo Image Card */}
                <div
                  className="relative h-44 bg-slate-950 cursor-pointer overflow-hidden flex items-center justify-center"
                  onClick={() => setActiveModalPhoto(photo)}
                >
                  <img
                    src={imgSrc}
                    alt={photo.title || photo.caption || "Valve Photo"}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as any).src = "https://placehold.co/600x400/0f172a/38bdf8?text=Valve+Photo";
                    }}
                  />

                  {/* Stage Badge Overlay */}
                  <div className="absolute top-2 left-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded shadow-2xs ${
                        isBefore ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
                      }`}
                    >
                      {isBefore ? "Before Dismantling" : "After Reclamation"}
                    </span>
                  </div>

                  {/* Actions overlay */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetId(photo.id);
                      }}
                      className="p-1 bg-black/70 hover:bg-rose-600 text-white rounded transition-colors"
                      title="Delete Photo Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="bg-black/70 p-1 rounded text-white">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2 text-xs">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/jobs/${photo.job_id}`}
                        className="font-mono text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                      >
                        {trackingId}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {photo.job_source || photo.job?.source || "FFC"}
                      </span>
                    </div>

                    <p className="font-semibold text-slate-900 line-clamp-1 mt-1 text-xs">
                      {valveDesc}
                    </p>

                    {valveTag && (
                      <p className="text-[10px] font-mono text-slate-500">
                        Tag: {valveTag}
                      </p>
                    )}

                    {workNotes && (
                      <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 text-[11px] text-slate-700 line-clamp-2 leading-relaxed">
                        <strong className={isBefore ? "text-amber-800" : "text-emerald-800"}>
                          {isBefore ? "Observed: " : "Executed: "}
                        </strong>
                        {workNotes}
                      </div>
                    )}
                  </div>

                  {/* Metadata Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="truncate">{techName} · {deptName}</span>
                    <span className="font-mono shrink-0">
                      {photo.created_at ? new Date(photo.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {activeModalPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-800 shadow-2xl">
            {/* Modal Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded ${
                    (activeModalPhoto.stage || activeModalPhoto.photo_stage) === "BEFORE"
                      ? "bg-amber-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {(activeModalPhoto.stage || activeModalPhoto.photo_stage) === "BEFORE"
                    ? "Before Dismantling"
                    : "After Reclamation"}
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {activeModalPhoto.tracking_id || activeModalPhoto.job?.tracking_id}
                </span>
                <span className="text-slate-300 font-semibold truncate max-w-md">
                  — {activeModalPhoto.valve_description || activeModalPhoto.job?.valve_description}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(activeModalPhoto.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
                  title="Delete record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveModalPhoto(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Image */}
            <div className="flex-1 bg-black flex items-center justify-center p-4 overflow-auto min-h-[300px] max-h-[62vh]">
              <img
                src={activeModalPhoto.image_data_url || api.getPhotoUrl(activeModalPhoto.id)}
                alt="Full resolution valve"
                className="max-h-full max-w-full object-contain rounded"
              />
            </div>

            {/* Modal Footer / Details */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs text-slate-300 space-y-2.5">
              {(activeModalPhoto.work_description || activeModalPhoto.work_done_notes) && (
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-slate-200">
                  <span className="font-bold text-emerald-400 block mb-0.5 text-[11px] font-mono uppercase">
                    {(activeModalPhoto.stage || activeModalPhoto.photo_stage) === "BEFORE"
                      ? "Observed Damage & Defect Findings: "
                      : "Reclamation Scope Executed: "}
                  </span>
                  <p className="leading-relaxed text-xs">
                    {activeModalPhoto.work_description || activeModalPhoto.work_done_notes}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2 font-mono">
                  <span>Logged by {activeModalPhoto.performed_by_name || "Assigned staff"}</span>
                  <span>·</span>
                  <span>{activeModalPhoto.department_name || "Fabrication Shop"}</span>
                  <span>·</span>
                  <span>{activeModalPhoto.created_at ? new Date(activeModalPhoto.created_at).toLocaleString() : ""}</span>
                </div>

                <Link
                  href={`/jobs/${activeModalPhoto.job_id}`}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-xs flex items-center gap-1 transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5" /> View Reclamation Job &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title="Delete Photo Record"
        message="Are you sure you want to permanently delete this valve photographic record? This action cannot be undone."
        confirmLabel={deleting ? "Deleting..." : "Permanently Delete"}
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTargetId(null)}
      />

      {/* Upload Valve Picture Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUploadSubmit}
            className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl overflow-y-auto max-h-[92vh]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Upload Valve Photo Record
                </h3>
              </div>
              <button
                type="button"
                onClick={closeUploadModal}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Select Job */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Associated Reclamation Job <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={uploadJobId}
                onChange={(e) => setUploadJobId(e.target.value)}
                className="w-full text-xs rounded border border-slate-300 p-2 bg-white focus:border-emerald-600 focus:outline-none"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.tracking_id} — {j.valve_description} ({j.source})
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Picture Stage <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setUploadStage("BEFORE")}
                  className={`p-2.5 rounded border text-xs font-bold flex flex-col items-center gap-0.5 transition-all ${
                    uploadStage === "BEFORE"
                      ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-200"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span>BEFORE WORK</span>
                  <span className="text-[10px] font-normal text-slate-500">Initial Dismantling</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadStage("AFTER")}
                  className={`p-2.5 rounded border text-xs font-bold flex flex-col items-center gap-0.5 transition-all ${
                    uploadStage === "AFTER"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span>AFTER WORK</span>
                  <span className="text-[10px] font-normal text-slate-500">Reclaimed Valve</span>
                </button>
              </div>
            </div>

            {/* LIVE CAMERA VIEWFINDER */}
            {isCameraActive && (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3] flex items-center justify-center">
                  {cameraLoading && (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-2 z-10">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                      <span className="text-xs font-mono">Connecting to camera feed...</span>
                    </div>
                  )}
                  <video
                    ref={setVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1.5 z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE CAMERA
                  </div>
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 z-10">
                    <button
                      type="button"
                      onClick={snapPhoto}
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-full shadow-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Snap Photo
                    </button>
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full cursor-pointer"
                      title="Flip camera"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer"
                  >
                    Cancel Camera
                  </button>
                </div>
              </div>
            )}

            {/* PHOTO FILE PICKER / CAMERA BUTTONS */}
            {!isCameraActive && (
              <div className="space-y-1.5 text-xs">
                <label className="block font-semibold text-slate-700">
                  Valve Picture <span className="text-rose-500">*</span>
                </label>

                <input
                  type="file"
                  ref={uploadFileInputRef}
                  id="valveGalleryInput"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                {!uploadPreview ? (
                  <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50 flex flex-col items-center justify-center">
                    <UploadCloud className="w-6 h-6 text-emerald-600 mb-1" />
                    <span className="text-xs font-semibold text-slate-800">Attach Valve Photo</span>

                    <div className="flex items-center gap-2 mt-2.5 w-full">
                      <button
                        type="button"
                        onClick={() => uploadFileInputRef.current?.click()}
                        className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold shadow-2xs cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                        <span>🖼️ Open Gallery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => startCamera("environment")}
                        className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-2xs flex items-center justify-center gap-1 cursor-pointer text-center"
                      >
                        <Video className="w-3.5 h-3.5 text-emerald-400" /> Use Camera
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-48 bg-slate-950 flex items-center justify-center">
                    <img src={uploadPreview} alt="Preview" className="max-h-48 object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setUploadFile(null);
                        setUploadPreview("");
                        if (uploadFileInputRef.current) uploadFileInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full hover:bg-rose-600 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded">
                      {uploadStage === "BEFORE" ? "BEFORE WORK" : "AFTER WORK"}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Performed By Technician */}
            <div className="text-xs">
              <label className="block font-semibold text-slate-700 mb-1">
                Technician / Logged By
              </label>
              <select
                value={uploadTechId}
                onChange={(e) => setUploadTechId(e.target.value)}
                className="w-full rounded border border-slate-300 p-2 bg-white focus:border-emerald-600 focus:outline-none"
              >
                <option value="">Select Technician...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Work Done / Observations Notes */}
            <div className="text-xs">
              <label className="block font-semibold text-slate-700 mb-1">
                {uploadStage === "BEFORE"
                  ? "Dismantling Observations & Problem Identified"
                  : "Reclamation Work Executed & Final Findings"}
              </label>
              <textarea
                rows={2}
                value={uploadWorkDone}
                onChange={(e) => setUploadWorkDone(e.target.value)}
                className="w-full rounded border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {/* Caption */}
            <div className="text-xs">
              <label className="block font-semibold text-slate-700 mb-1">
                Photo Caption (Optional)
              </label>
              <input
                type="text"
                autoComplete="off"
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                className="w-full rounded border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={closeUploadModal}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !uploadFile}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Save Photo Record
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
