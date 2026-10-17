"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  FileEdit,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Building2,
  Calendar,
  Layers,
  Save,
  ArrowLeft,
  Trash2,
  Clock,
  ShieldAlert,
  ChevronRight,
  X,
  Plus,
  Check,
  RefreshCw
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ConfirmModal from "@/components/ConfirmModal";

const PREDEFINED_OPERATIONS = [
  "Seat Reclamation",
  "Machining",
  "Lapping",
  "Stelliting",
  "Stem Work",
  "Gland Packing Replacement",
  "Gasket Fabrication",
  "Gate / Disc / Plug Work",
  "Back-seat Work",
  "Ends Repair",
];

export default function EditReclamationJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = Number(params.id);

  // Reference data
  const [plants, setPlants] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Original tracking ID
  const [trackingId, setTrackingId] = useState("");
  const [currentStatus, setCurrentStatus] = useState("RECEIVED");

  // Form State
  const [source, setSource] = useState<string>("PLANT_1");
  const [plantId, setPlantId] = useState<number | string>("");
  const [departmentId, setDepartmentId] = useState<number | string>("");
  const [externalCustomerId, setExternalCustomerId] = useState<number | string>("");

  const [notificationNo, setNotificationNo] = useState("");
  const [workOrderRef, setWorkOrderRef] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [dateReceived, setDateReceived] = useState("");
  const [requiredCompletionDate, setRequiredCompletionDate] = useState("");

  // Valve Specs
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

  // Operation Categories
  const [selectedOperationCategories, setSelectedOperationCategories] = useState<string[]>([]);
  const [customOperationInput, setCustomOperationInput] = useState("");
  const [showCustomOpInput, setShowCustomOpInput] = useState(false);

  const toggleOperationCategory = (category: string) => {
    setSelectedOperationCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleAddCustomOperation = () => {
    const trimmed = customOperationInput.trim();
    if (!trimmed) return;
    if (!selectedOperationCategories.includes(trimmed)) {
      setSelectedOperationCategories((prev) => [...prev, trimmed]);
    }
    setCustomOperationInput("");
    setShowCustomOpInput(false);
  };

  // Load Reference Data and Job Details
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [plantsData, custsData, jobData] = await Promise.all([
          api.getPlants(),
          api.getExternalCustomers(),
          api.getJobDetail(jobId),
        ]);

        setPlants(plantsData);
        setCustomers(custsData);

        // Populate Job Data
        setTrackingId(jobData.tracking_id);
        setCurrentStatus(jobData.status || "RECEIVED");
        setSource(jobData.source || "PLANT_1");
        setPlantId(jobData.plant_id || "");
        setExternalCustomerId(jobData.external_customer_id || "");

        // Load departments for this job's plant
        if (jobData.plant_id) {
          const depts = await api.getDepartments(jobData.plant_id);
          setDepartments(depts);
          setDepartmentId(jobData.department_id || "");
        } else if (jobData.source === "PLANT_1") {
          const p1 = plantsData.find((p: any) => p.code === "PLANT_1");
          if (p1) {
            setPlantId(p1.id);
            const depts = await api.getDepartments(p1.id);
            setDepartments(depts);
            setDepartmentId(jobData.department_id || (depts[0]?.id || ""));
          }
        }

        setNotificationNo(jobData.notification_no || "");
        setWorkOrderRef(jobData.work_order_ref || "");
        setPriority(jobData.priority || "NORMAL");
        setDateReceived(jobData.date_received || new Date().toISOString().split("T")[0]);
        setRequiredCompletionDate(jobData.required_completion_date || "");

        setValveDescription(jobData.valve_description || "");
        setValveTagNo(jobData.valve_tag_no || "");
        setValveSerialNo(jobData.valve_serial_no || "");
        setValveType(jobData.valve_type || "Gate");
        setManufacturer(jobData.manufacturer || "");
        setModel(jobData.model || "");
        setSize(jobData.size || '4"');
        setPressureRating(jobData.pressure_rating || "300#");
        setValveQuantity(jobData.valve_quantity || 1);
        setValveMaterial(jobData.valve_material || "WCB Carbon Steel");
        setProcessServiceDetails(jobData.process_service_details || "");
        setAdditionalTechnicalDesc(jobData.additional_technical_desc || "");
        setGeneralRemarks(jobData.general_remarks || "");

        if (jobData.operation_categories) {
          const cats = jobData.operation_categories
            .split(",")
            .map((c: string) => c.trim())
            .filter((c: string) => Boolean(c));
          setSelectedOperationCategories(cats);
        }
      } catch (err: any) {
        console.error("Failed to load job for editing:", err);
        setError(err.message || "Failed to load reclamation job details.");
      } finally {
        setLoading(false);
      }
    }

    if (jobId) {
      loadData();
    }
  }, [jobId]);

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

  const handlePlantChange = async (pId: string | number) => {
    setPlantId(pId);
    if (pId) {
      const depts = await api.getDepartments(Number(pId));
      setDepartments(depts);
      setDepartmentId(depts.length > 0 ? depts[0].id : "");
    } else {
      setDepartments([]);
      setDepartmentId("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    if (!valveDescription.trim()) {
      setError("Valve Description is mandatory.");
      setSaving(false);
      return;
    }

    if ((source === "PLANT_1" || source === "PLANT_2") && (!plantId || !departmentId)) {
      setError("Plant and Department must be selected for FFC jobs.");
      setSaving(false);
      return;
    }

    if (source === "EXTERNAL" && !externalCustomerId) {
      setError("External Customer is required for Miscellaneous / External jobs.");
      setSaving(false);
      return;
    }

    try {
      const payload: any = {
        source,
        plant_id: source !== "EXTERNAL" ? Number(plantId) : null,
        department_id: source !== "EXTERNAL" ? Number(departmentId) : null,
        external_customer_id: source === "EXTERNAL" ? Number(externalCustomerId) : null,
        notification_no: notificationNo || null,
        work_order_ref: workOrderRef || null,
        priority,
        operation_categories: selectedOperationCategories.join(", "),
        date_received: dateReceived || null,
        required_completion_date: requiredCompletionDate || null,
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

      await api.updateJob(jobId, payload);
      setSuccessMsg("Valve reclamation details updated successfully.");
      setTimeout(() => {
        router.push(`/jobs/${jobId}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to update valve reclamation job.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.deleteJob(jobId);
      router.push("/jobs");
    } catch (err: any) {
      alert("Failed to delete entry: " + (err.message || "Unknown error"));
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2.5">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Loading record {jobId}...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title={`Edit ${trackingId}`}
        description="Modify technical specifications, priority, plant origin, or notification details."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 text-white uppercase">
            {currentStatus.replace(/_/g, " ")}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/jobs/${jobId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Back</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-2xs disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        }
      />

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Origin & Priority */}
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
                Source Classification <span className="text-rose-500">*</span>
              </label>
              <select
                value={source}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-600"
              >
                <option value="PLANT_1">FFC Plant 1 (Goth Machhi)</option>
                <option value="PLANT_2">FFC Plant 2 (Goth Machhi)</option>
                <option value="EXTERNAL">Miscellaneous / External Client</option>
              </select>
            </div>

            {source !== "EXTERNAL" ? (
              <>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Operating Unit Plant <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={plantId}
                    onChange={(e) => handlePlantChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-600"
                  >
                    {plants
                      .filter((p) => p.code === source)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Department / Section <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.code ? `(${d.code})` : ""}
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
                <option value="Safety Relief">Safety Relief Valve (PSV)</option>
                <option value="Diaphragm">Diaphragm Valve</option>
                <option value="Other">Other Specialty Valve</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tag Number</label>
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
              <label className="block text-slate-700 font-semibold mb-1">Quantity</label>
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

          <div>
            <label className="block text-slate-700 font-semibold mb-1 text-xs">
              General Remarks / Intake Notes
            </label>
            <textarea
              rows={2}
              value={generalRemarks}
              onChange={(e) => setGeneralRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Section 3: Operation Categories */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                3. Operation Categories (Multi-Select)
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Toggle all applicable operations or enter custom categories.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {PREDEFINED_OPERATIONS.map((op) => {
              const isSelected = selectedOperationCategories.includes(op);
              return (
                <button
                  key={op}
                  type="button"
                  onClick={() => toggleOperationCategory(op)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-2xs"
                      : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                      isSelected
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5" />}
                  </span>
                  <span>{op}</span>
                </button>
              );
            })}

            {/* Custom categories */}
            {selectedOperationCategories
              .filter((c) => !PREDEFINED_OPERATIONS.includes(c))
              .map((custom) => (
                <div
                  key={custom}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-emerald-50 border-emerald-300 text-emerald-900 text-xs font-semibold shadow-2xs"
                >
                  <span>{custom}</span>
                  <button
                    type="button"
                    onClick={() => toggleOperationCategory(custom)}
                    className="text-emerald-700 hover:text-rose-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

            {showCustomOpInput ? (
              <div className="inline-flex items-center gap-1 bg-white border border-emerald-500 rounded-lg p-0.5 shadow-xs">
                <input
                  type="text"
                  autoFocus
                  value={customOperationInput}
                  onChange={(e) => setCustomOperationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomOperation();
                    }
                  }}
                  className="px-2 py-1 text-xs border-0 focus:outline-none text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddCustomOperation}
                  className="px-2 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomOpInput(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomOpInput(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-800 text-xs transition"
              >
                <Plus className="w-3 h-3" />
                <span>+ Custom Operation</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Link
            href={`/jobs/${jobId}`}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-6 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-2xs disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Reclamation Job"
        message={`Are you sure you want to permanently delete reclamation entry ${trackingId}? This will remove all associated tests, photos, and linked records.`}
        confirmLabel="Yes, Delete Job"
        isLoading={deleting}
        isDestructive={true}
      />
    </div>
  );
}
