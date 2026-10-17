"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  FilePlus2,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Building2,
  Calendar,
  Save,
  ArrowLeft,
  ScanLine,
  Camera,
  Video,
  X,
  Plus,
  RefreshCw,
  UploadCloud
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ConfirmModal from "@/components/ConfirmModal";
import { registerCloseHandler } from "@/lib/modalRegistry";

export default function RegisterReclamationPage() {
  const router = useRouter();

  // Reference data
  const [plants, setPlants] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Section 1: Source & Organization
  const [source, setSource] = useState<string>("PLANT_1");
  const [plantId, setPlantId] = useState<number | string>("");
  const [departmentId, setDepartmentId] = useState<number | string>("");
  const [externalCustomerId, setExternalCustomerId] = useState<number | string>("");

  const [notificationNo, setNotificationNo] = useState("");
  const [workOrderRef, setWorkOrderRef] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [dateReceived, setDateReceived] = useState(new Date().toISOString().split("T")[0]);
  const [requiredCompletionDate, setRequiredCompletionDate] = useState("");
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<number | string>("");

  // Section 2: Valve Specs
  const [valveDescription, setValveDescription] = useState("");
  const [valveTagNo, setValveTagNo] = useState("");
  const [valveSerialNo, setValveSerialNo] = useState("");
  const [valveType, setValveType] = useState("Gate");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [size, setSize] = useState('4"');
  const [pressureRating, setPressureRating] = useState("300#");
  const [valveQuantity, setValveQuantity] = useState(1);
  const [valveMaterial, setValveMaterial] = useState("WCB Carbon Steel");
  const [processServiceDetails, setProcessServiceDetails] = useState("");
  const [additionalTechnicalDesc, setAdditionalTechnicalDesc] = useState("");
  const [generalRemarks, setGeneralRemarks] = useState("");

  // Extracted / pre-filled operation categories from scanner (passed to record)
  const [operationCategories, setOperationCategories] = useState<string>("");

  // Section 3: Initial Inspection (Optional)
  const [reportedProblem, setReportedProblem] = useState("");
  const [observedDamage, setObservedDamage] = useState("");
  const [initialCondition, setInitialCondition] = useState("Worn / Passing");
  const [recommendedWork, setRecommendedWork] = useState("");

  // Section 4: Before Work Photo
  const [beforePhotoFile, setBeforePhotoFile] = useState<File | null>(null);
  const [beforePhotoPreview, setBeforePhotoPreview] = useState<string | null>(null);
  const [beforePhotoNotes, setBeforePhotoNotes] = useState("");
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load plants, customers, techs & query parameters
  useEffect(() => {
    async function loadData() {
      try {
        const [plantsData, custsData, usersData] = await Promise.all([
          api.getPlants(),
          api.getExternalCustomers(),
          api.getUsers().catch(() => []),
        ]);
        setPlants(plantsData);
        setCustomers(custsData);
        setTechnicians(usersData.filter((u: any) => u.role === "technician" || u.role === "fab_shop"));

        // Pre-fill query parameters if navigated from Certificate Scanner
        if (typeof window !== "undefined") {
          const sp = new URLSearchParams(window.location.search);
          if (sp.get("notification_no")) setNotificationNo(sp.get("notification_no")!);
          if (sp.get("valve_description")) setValveDescription(sp.get("valve_description")!);
          if (sp.get("valve_tag_no")) setValveTagNo(sp.get("valve_tag_no")!);
          if (sp.get("size")) setSize(sp.get("size")!);
          if (sp.get("pressure_rating")) setPressureRating(sp.get("pressure_rating")!);
          if (sp.get("source")) setSource(sp.get("source")!);
          if (sp.get("operation_categories")) setOperationCategories(sp.get("operation_categories")!);
        }

        // Default to Plant 1
        const p1 = plantsData.find((p: any) => p.code === "PLANT_1");
        if (p1) {
          setPlantId(p1.id);
          const p1Depts = await api.getDepartments(p1.id);
          setDepartments(p1Depts);
          if (p1Depts.length > 0) setDepartmentId(p1Depts[0].id);
        }
      } catch (err: any) {
        console.error("Failed to load reference data", err);
      }
    }
    loadData();
  }, []);

  // Handle Source changes
  const handleSourceChange = async (newSource: string) => {
    setSource(newSource);
    setError(null);
    if (newSource === "PLANT_1") {
      const p1 = plants.find((p: any) => p.code === "PLANT_1");
      if (p1) {
        setPlantId(p1.id);
        const depts = await api.getDepartments(p1.id);
        setDepartments(depts);
        setDepartmentId(depts.length > 0 ? depts[0].id : "");
      }
      setExternalCustomerId("");
    } else if (newSource === "PLANT_2") {
      const p2 = plants.find((p: any) => p.code === "PLANT_2");
      if (p2) {
        setPlantId(p2.id);
        const depts = await api.getDepartments(p2.id);
        setDepartments(depts);
        setDepartmentId(depts.length > 0 ? depts[0].id : "");
      }
      setExternalCustomerId("");
    } else if (newSource === "EXTERNAL") {
      setPlantId("");
      setDepartmentId("");
      setDepartments([]);
      if (customers.length > 0) setExternalCustomerId(customers[0].id);
    }
  };

  // Camera handlers
  const startCamera = async () => {
    try {
      setShowCameraModal(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      alert("Unable to access camera: " + err);
      setShowCameraModal(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  useEffect(() => {
    if (!showCameraModal) return;
    const unregister = registerCloseHandler("jobNewCamera", stopCamera, 30);
    return unregister;
  }, [showCameraModal, cameraStream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `valve-receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
        setBeforePhotoFile(file);
        setBeforePhotoPreview(canvas.toDataURL("image/jpeg"));
      }
    }, "image/jpeg", 0.9);

    stopCamera();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBeforePhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setBeforePhotoPreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRequestSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!valveDescription.trim()) {
      setError("Valve Description is required.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if ((source === "PLANT_1" || source === "PLANT_2") && (!plantId || !departmentId)) {
      setError("Plant and Department are required for FFC jobs.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (source === "EXTERNAL" && !externalCustomerId) {
      setError("External Customer is required for Miscellaneous / External jobs.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        source,
        plant_id: source !== "EXTERNAL" ? Number(plantId) : null,
        department_id: source !== "EXTERNAL" ? Number(departmentId) : null,
        external_customer_id: source === "EXTERNAL" ? Number(externalCustomerId) : null,
        notification_no: notificationNo || null,
        work_order_ref: workOrderRef || null,
        priority,
        operation_categories: operationCategories || null,
        date_received: dateReceived,
        required_completion_date: requiredCompletionDate || null,
        assigned_technician_id: assignedTechnicianId ? Number(assignedTechnicianId) : null,
        valve_description: valveDescription,
        valve_tag_no: valveTagNo || null,
        valve_serial_no: valveSerialNo || null,
        valve_type: valveType,
        manufacturer: manufacturer || null,
        model: model || null,
        size: size || null,
        pressure_rating: pressureRating || null,
        valve_quantity: Number(valveQuantity) || 1,
        valve_material: valveMaterial || null,
        process_service_details: processServiceDetails || null,
        additional_technical_desc: additionalTechnicalDesc || null,
        general_remarks: generalRemarks || null,
      };

      const newJob = await api.registerJob(payload);

      // Record initial inspection if provided
      if (reportedProblem || observedDamage || recommendedWork) {
        await api.addInspection(newJob.id, {
          inspection_type: "INITIAL",
          reported_problem: reportedProblem,
          observed_damage: observedDamage,
          initial_condition: initialCondition,
          recommended_work: recommendedWork,
        }).catch((err) => console.warn("Could not save initial inspection:", err));
      }

      // Upload Before Photo if attached
      if (beforePhotoFile) {
        const photoData = new FormData();
        photoData.append("file", beforePhotoFile);
        photoData.append("photo_stage", "BEFORE");
        photoData.append("caption", "Valve condition at receipt / initial dismantling");
        if (beforePhotoNotes) photoData.append("work_done_notes", beforePhotoNotes);
        await api.uploadValvePhoto(newJob.id, photoData).catch((err) =>
          console.warn("Could not upload before photo:", err)
        );
      }

      setShowConfirmModal(false);
      router.push(`/jobs/${newJob.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to register reclamation job.");
      setShowConfirmModal(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Register Valve Reclamation"
        description="Assign a permanent unique tracking ID (VR-YYYY-XXXXXX), origin, and operation scope."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/jobs"
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => handleRequestSubmit()}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-2xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Register</span>
                </>
              )}
            </button>
          </div>
        }
      />

      {/* Certificate Scanner Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <ScanLine className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-2">
              Have a Paper Certificate or Work Order?
              <span className="px-1.5 py-0.2 text-[9px] font-mono bg-emerald-500 text-slate-950 rounded font-bold">
                AUTO-FILL
              </span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Use live camera OCR to scan Form QF-003-05-307 and auto-populate all technical fields.
            </p>
          </div>
        </div>
        <Link
          href="/jobs/scan"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-2xs shrink-0"
        >
          <ScanLine className="w-3.5 h-3.5" />
          <span>Launch Certificate Scanner</span>
        </Link>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRequestSubmit} className="space-y-6">
        {/* Section 1: Source & Priority */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              1. Origin & Priority Classification
            </h2>
            {priority === "EMERGENCY" && (
              <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded tracking-wider">
                EMERGENCY PRIORITY
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Source Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={source}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-600"
              >
                <option value="PLANT_1">FFC Plant 1</option>
                <option value="PLANT_2">FFC Plant 2</option>
                <option value="EXTERNAL">External / Miscellaneous</option>
              </select>
            </div>

            {source !== "EXTERNAL" ? (
              <>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Plant Location</label>
                  <input
                    type="text"
                    disabled
                    value={source === "PLANT_1" ? "Plant 1 — Goth Machhi" : "Plant 2 — Goth Machhi"}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-600"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  External Client Account <span className="text-rose-500">*</span>
                </label>
                <select
                  value={externalCustomerId}
                  onChange={(e) => setExternalCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-600"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_name} {c.plant_facility_name ? `— ${c.plant_facility_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs pt-1">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Notification No.</label>
              <input
                type="text"
                value={notificationNo}
                onChange={(e) => setNotificationNo(e.target.value)}
                autoComplete="off"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Work Order Ref</label>
              <input
                type="text"
                value={workOrderRef}
                onChange={(e) => setWorkOrderRef(e.target.value)}
                autoComplete="off"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium focus:outline-none border ${
                  priority === "EMERGENCY"
                    ? "bg-rose-50 border-rose-400 text-rose-900 font-bold"
                    : priority === "URGENT"
                    ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent (Shutdown Outage)</option>
                <option value="EMERGENCY">Emergency (Immediate)</option>
                <option value="LOW">Low / Routine</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Date Received</label>
              <input
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Technical Specifications */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-slate-400" />
              2. Technical Valve Specifications
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">
                Valve Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={valveDescription}
                onChange={(e) => setValveDescription(e.target.value)}
                autoComplete="off"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Valve Type</label>
              <select
                value={valveType}
                onChange={(e) => setValveType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-600"
              >
                <option value="Gate">Gate Valve</option>
                <option value="Globe">Globe Valve</option>
                <option value="Check">Check Valve</option>
                <option value="Ball">Ball Valve</option>
                <option value="Butterfly">Butterfly Valve</option>
                <option value="Plug">Plug Valve</option>
                <option value="Control">Control Valve</option>
                <option value="Safety">Safety Relief Valve</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Valve Tag No.</label>
              <input
                type="text"
                value={valveTagNo}
                onChange={(e) => setValveTagNo(e.target.value)}
                autoComplete="off"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Serial Number</label>
              <input
                type="text"
                value={valveSerialNo}
                onChange={(e) => setValveSerialNo(e.target.value)}
                autoComplete="off"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Size</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                autoComplete="off"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Pressure Rating</label>
              <input
                type="text"
                value={pressureRating}
                onChange={(e) => setPressureRating(e.target.value)}
                autoComplete="off"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Valve Quantity</label>
              <input
                type="number"
                min="1"
                value={valveQuantity}
                onChange={(e) => setValveQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Manufacturer</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                autoComplete="off"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Body Material</label>
              <input
                type="text"
                value={valveMaterial}
                onChange={(e) => setValveMaterial(e.target.value)}
                autoComplete="off"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Initial Photo Upload (With Live Camera) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-400" />
                3. Initial Condition Visual Evidence (Optional)
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Capture or attach a photo of the valve as received before reclamation work starts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Upload & Camera Trigger Zone */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  id="beforePhotoInput"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("beforePhotoInput") as HTMLInputElement;
                    if (el) el.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer transition shadow-2xs active:scale-98"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                  <span>🖼️ Open Gallery</span>
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition shadow-2xs"
                >
                  <Video className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Use Live Camera</span>
                </button>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Condition Notes
                </label>
                <textarea
                  rows={2}
                  value={beforePhotoNotes}
                  onChange={(e) => setBeforePhotoNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Photo Preview Box */}
            <div className="border border-dashed border-slate-200 rounded-xl p-3 flex items-center justify-center bg-slate-50/50 min-h-[140px]">
              {beforePhotoPreview ? (
                <div className="relative group">
                  <img
                    src={beforePhotoPreview}
                    alt="Before Reclamation Preview"
                    className="max-h-36 rounded-lg object-contain border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setBeforePhotoFile(null);
                      setBeforePhotoPreview(null);
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full shadow-xs hover:bg-rose-700 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="text-center text-slate-400">
                  <Camera className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                  <p className="text-[11px]">No photo attached</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Clean, ergonomic position with safe-area padding away from system gesture/nav bar */}
        <div className="pt-6 pb-28 sm:pb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-slate-200">
          <Link
            href="/jobs"
            className="px-5 py-3 min-h-[48px] flex items-center justify-center text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => handleRequestSubmit()}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md active:scale-95 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Registering Valve...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save & Generate Tracking ID</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Registration Confirmation Dialog to prevent accidental taps/double submissions */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => !submitting && setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirm Valve Registration"
        message="Please verify the valve registration details before generating a permanent tracking ID."
        confirmLabel={submitting ? "Registering..." : "Confirm & Register"}
        cancelLabel="Review Form"
        isDestructive={false}
        isLoading={submitting}
        details={
          <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-200 text-xs">
            <div className="flex justify-between items-start gap-2">
              <span className="text-slate-500 shrink-0">Valve:</span>
              <span className="font-semibold text-slate-800 text-right">{valveDescription || "—"}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-slate-500 shrink-0">Origin / Source:</span>
              <span className="font-semibold text-slate-800 text-right">
                {source === "EXTERNAL"
                  ? customers.find((c) => c.id === Number(externalCustomerId))?.company_name || "External Customer"
                  : `${plants.find((p) => p.id === Number(plantId))?.name || "Plant"} · ${
                      departments.find((d) => d.id === Number(departmentId))?.name || "Department"
                    }`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Priority:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  priority === "EMERGENCY"
                    ? "bg-rose-100 text-rose-800"
                    : priority === "HIGH"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {priority}
              </span>
            </div>
            {notificationNo && (
              <div className="flex justify-between">
                <span className="text-slate-500">Notification No:</span>
                <span className="font-medium text-slate-700">{notificationNo}</span>
              </div>
            )}
            {beforePhotoFile && (
              <div className="flex justify-between">
                <span className="text-slate-500">Before Photo:</span>
                <span className="font-medium text-emerald-700">Attached ({beforePhotoFile.name})</span>
              </div>
            )}
          </div>
        }
      />

      {/* Live Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-3 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-600" />
                Capture Before Work Photo
              </h3>
              <button
                onClick={stopCamera}
                className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 active:scale-95 transition"
                aria-label="Close camera"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2.5 min-h-[44px] text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-xs"
              >
                <Camera className="w-4 h-4" />
                Snap Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
