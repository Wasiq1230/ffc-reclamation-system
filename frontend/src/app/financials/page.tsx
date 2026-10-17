"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getStoredUser } from "@/lib/api";
import {
  FileCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Plus,
  Download,
  ExternalLink,
  RefreshCw,
  Info,
  X,
  AlertTriangle,
  Award,
  FileSpreadsheet,
  Wrench,
  Eye,
  Filter,
  Loader2,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ConfirmModal from "@/components/ConfirmModal";

interface ReclamationItem {
  id: number | null;
  job_id: number;
  tracking_id: string;
  valve_description: string;
  valve_tag_no?: string;
  valve_serial_no?: string;
  priority: string;
  source: string;
  plant_name?: string;
  department_name?: string;
  customer_name?: string;
  notification_no?: string;
  job_status: string;

  certificate_status: "NOT_GENERATED" | "GENERATED" | "PENDING_COMPLETION" | "ERROR";
  certificate_status_label: string;
  certificate_id?: number | null;
  certificate_number?: string | null;
  certificate_workflow_status?: string | null;
  certificate_tooltip: string;

  created_at?: string;
  updated_at?: string;
}

export default function ReclamationRecordsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Data states
  const [items, setItems] = useState<ReclamationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [certFilter, setCertFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  // Notification banners
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<ReclamationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = currentUser?.role === "admin";
  const isAuthorized = currentUser && ["admin", "fab_shop", "viewer"].includes(currentUser.role);

  const [downloadingCertId, setDownloadingCertId] = useState<number | null>(null);

  const handleDownloadPdf = async (certId: number, certNumber: string = "CERTIFICATE") => {
    setDownloadingCertId(certId);
    try {
      await api.downloadCertificatePdf(certId, certNumber);
      showNotification("success", `Certificate ${certNumber} downloaded successfully`);
    } catch (err: any) {
      console.error("PDF download error:", err);
      showNotification("error", "Failed to download PDF: " + (err.message || "Unknown error"));
    } finally {
      setDownloadingCertId(null);
    }
  };

  // Load user
  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  // Load reclamation records
  const loadRecords = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const params: Record<string, any> = {
        only_with_records: false,
        limit: 500,
      };
      if (search.trim()) params.search = search.trim();
      if (certFilter !== "ALL") params.certificate_status = certFilter;
      if (sourceFilter !== "ALL") params.source = sourceFilter;

      const data = await api.getFinancialList(params);
      setItems(data.items || []);
    } catch (err: any) {
      console.error("Error loading reclamation records:", err);
      showNotification("error", err?.message || "Failed to load reclamation records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [certFilter, sourceFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadRecords(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const showNotification = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 6000);
  };

  // Filtered items based on client-side status & priority filters
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "ALL" && item.job_status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && item.priority !== priorityFilter) return false;
      return true;
    });
  }, [items, statusFilter, priorityFilter]);

  // Dynamic KPI Stats calculated from current records
  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) =>
      ["COMPLETED", "CERTIFICATE_ISSUED", "READY_FOR_DELIVERY", "DELIVERED"].includes(i.job_status)
    ).length;
    const inProgress = items.filter((i) =>
      [
        "INSPECTION_IN_PROGRESS",
        "RECLAMATION_IN_PROGRESS",
        "TESTING_QUALITY_INSPECTION",
        "RECEIVED",
        "REGISTERED",
      ].includes(i.job_status)
    ).length;
    const certGenerated = items.filter((i) => i.certificate_status === "GENERATED").length;
    const certPending = items.filter((i) => i.certificate_status !== "GENERATED").length;
    return { total, completed, inProgress, certGenerated, certPending };
  }, [items]);

  // Handle Delete Confirmation & Execution
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.job_id) {
        await api.deleteJob(deleteTarget.job_id);
      } else if (deleteTarget.id) {
        await api.deleteFinancialRecord(deleteTarget.id);
      }
      showNotification(
        "success",
        `Reclamation record ${deleteTarget.tracking_id} deleted successfully.`
      );
      setDeleteTarget(null);
      loadRecords(true);
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to delete reclamation record");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Generate Certificate from job
  const handleGenerateCertificate = async (jobId: number, trackingId: string) => {
    try {
      const res = await api.createCertificateFromJob(jobId);
      showNotification("success", `Certificate created for ${trackingId}. Redirecting to editor...`);
      setTimeout(() => {
        router.push(`/certificates/editor/${res.id}`);
      }, 700);
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to generate certificate");
    }
  };

  // Render Certificate Status Badge
  const renderCertificateBadge = (item: ReclamationItem) => {
    switch (item.certificate_status) {
      case "GENERATED":
        return (
          <div className="group relative inline-block">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-help">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>Generated</span>
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2 bg-slate-900 text-white text-[11px] rounded shadow-lg leading-tight text-center">
              {item.certificate_tooltip}
              {item.certificate_number && (
                <div className="font-mono text-emerald-400 font-bold mt-1">
                  {item.certificate_number}
                </div>
              )}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
          </div>
        );

      case "PENDING_COMPLETION":
        return (
          <div className="group relative inline-block">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono uppercase bg-amber-50 text-amber-900 border border-amber-200 cursor-help">
              <Clock className="w-3 h-3 text-amber-700 shrink-0" />
              <span>Pending Review</span>
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 p-2 bg-slate-900 text-white text-[11px] rounded shadow-lg leading-tight text-center">
              {item.certificate_tooltip}
              <div className="text-amber-400 text-[10px] mt-1">
                Draft created. Requires final witness approval or official issuance.
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
          </div>
        );

      case "ERROR":
        return (
          <div className="group relative inline-block">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-rose-50 text-rose-800 border border-rose-200 cursor-help">
              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
              <span>Action Req.</span>
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2 bg-slate-900 text-white text-[11px] rounded shadow-lg leading-tight text-center">
              {item.certificate_tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
          </div>
        );

      case "NOT_GENERATED":
      default:
        return (
          <div className="group relative inline-block">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium font-mono uppercase bg-slate-100 text-slate-600 border border-slate-200 cursor-help">
              <Info className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Not Generated</span>
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2 bg-slate-900 text-white text-[11px] rounded shadow-lg leading-tight text-center">
              {item.certificate_tooltip}
              <div className="text-slate-300 text-[10px] mt-1">
                Click "+ Generate" to produce Form QF-003-05-307.
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
          </div>
        );
    }
  };

  // Render Job Technical Status Badge
  const renderJobStatusBadge = (s: string) => {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 text-slate-700">
        {s?.replace(/_/g, " ") || "Active"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Reclamation Records Registry"
        description="Central ledger for valve reclamation tracking IDs, technical status, Form QF-003-05-307 certificate validation, and operational history."
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded">
            {stats.total} Records
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadRecords(true)}
              disabled={refreshing}
              className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            </button>
            <Link
              href="/jobs/new"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-2xs transition-colors"
            >
              + New Reclamation Record
            </Link>
          </div>
        }
      />

      {/* Notification Toast Banner */}
      {notification && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : notification.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Records</span>
          <div className="text-xl font-bold font-mono text-slate-900">{stats.total}</div>
          <span className="text-[10px] text-slate-400 block">All registered jobs</span>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Completed</span>
          <div className="text-xl font-bold font-mono text-emerald-800">{stats.completed}</div>
          <span className="text-[10px] text-slate-400 block">Ready or delivered</span>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">In Progress</span>
          <div className="text-xl font-bold font-mono text-slate-800">{stats.inProgress}</div>
          <span className="text-[10px] text-slate-400 block">Active reclamation</span>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Certificates Ready</span>
          <div className="text-xl font-bold font-mono text-emerald-700">{stats.certGenerated}</div>
          <span className="text-[10px] text-slate-400 block">QF-003 generated</span>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Pending Certs</span>
          <div className="text-xl font-bold font-mono text-amber-700">{stats.certPending}</div>
          <span className="text-[10px] text-slate-400 block">Awaiting certification</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        {/* Toolbar & Filters */}
        <div className="p-3.5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-50/50">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              aria-label="Search tracking, tag, notification"
              className="w-full pl-9 pr-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-base sm:text-xs bg-white border border-slate-300 rounded-xl sm:rounded text-slate-800 focus:outline-none focus:border-emerald-600"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-3 sm:top-2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={certFilter}
              onChange={(e) => setCertFilter(e.target.value)}
              className="py-2 sm:py-1 px-3 sm:px-2 min-h-[40px] sm:min-h-0 bg-white border border-slate-300 rounded-lg text-sm sm:text-xs text-slate-700 focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">All Certificates</option>
              <option value="GENERATED">Generated</option>
              <option value="PENDING_COMPLETION">Pending Review</option>
              <option value="NOT_GENERATED">Not Generated</option>
              <option value="ERROR">Error</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 sm:py-1 px-3 sm:px-2 min-h-[40px] sm:min-h-0 bg-white border border-slate-300 rounded-lg text-sm sm:text-xs text-slate-700 focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">All Work Stages</option>
              <option value="RECEIVED">Received</option>
              <option value="INSPECTION_IN_PROGRESS">Inspecting</option>
              <option value="RECLAMATION_IN_PROGRESS">In Reclamation</option>
              <option value="TESTING_QUALITY_INSPECTION">Pressure Testing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CERTIFICATE_ISSUED">Cert Issued</option>
              <option value="DELIVERED">Delivered</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="py-2 sm:py-1 px-3 sm:px-2 min-h-[40px] sm:min-h-0 bg-white border border-slate-300 rounded-lg text-sm sm:text-xs text-slate-700 focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">All Priorities</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="py-2 sm:py-1 px-3 sm:px-2 min-h-[40px] sm:min-h-0 bg-white border border-slate-300 rounded-lg text-sm sm:text-xs text-slate-700 focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">All Plants</option>
              <option value="PLANT_1">Plant 1 (FFC)</option>
              <option value="PLANT_2">Plant 2 (FFC)</option>
              <option value="EXTERNAL">External</option>
            </select>
          </div>
        </div>

        {/* Loading and Empty State */}
        {loading ? (
          <div className="py-14 text-center text-slate-400 font-mono text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            <span>Loading reclamation registry...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-14 text-center text-slate-500 px-4">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 text-sm">No reclamation records found.</p>
            <p className="text-xs text-slate-400 mt-1">
              {search || certFilter !== "ALL" || statusFilter !== "ALL"
                ? "Try clearing filters or search query."
                : "Click '+ New Reclamation Record' to add a valve."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (<md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <div key={`mob-${item.job_id}-${item.id || "rec"}`} className="p-4 space-y-3 active:bg-slate-50/50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/jobs/${item.job_id}`} className="font-mono font-bold text-sm text-emerald-800 hover:underline">
                        {item.tracking_id}
                      </Link>
                      {item.notification_no && (
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          WO: {item.notification_no}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {renderJobStatusBadge(item.job_status)}
                      {item.priority === "EMERGENCY" && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-rose-600 text-white font-mono font-bold uppercase animate-pulse">
                          EMERGENCY
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm leading-snug">
                      {item.valve_description}
                    </h4>
                    {item.valve_tag_no && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-slate-600 font-mono">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 border border-slate-200">
                          Tag: {item.valve_tag_no} {item.valve_serial_no ? `· S/N: ${item.valve_serial_no}` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <div className="text-slate-600 text-[11px]">
                      {item.source === "EXTERNAL" ? (
                        <span className="text-blue-800 font-semibold">{item.customer_name || "External Client"}</span>
                      ) : (
                        <span className="font-semibold text-slate-800">{item.plant_name || item.source}</span>
                      )}
                      {item.department_name && <span className="text-slate-400"> · {item.department_name}</span>}
                    </div>
                    <div>{renderCertificateBadge(item)}</div>
                  </div>

                  {/* Contextual Certificate and Item Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {item.certificate_status === "GENERATED" && item.certificate_id && (
                        <>
                          <Link
                            href={`/certificates/editor/${item.certificate_id}`}
                            className="px-3 py-2 min-h-[40px] flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 transition active:scale-95"
                          >
                            <span>Editor</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(item.certificate_id!, item.certificate_number || "CERTIFICATE")}
                            disabled={downloadingCertId === item.certificate_id}
                            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition active:scale-95 disabled:opacity-50"
                            title="Download PDF"
                          >
                            {downloadingCertId === item.certificate_id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}

                      {item.certificate_status === "PENDING_COMPLETION" && item.certificate_id && (
                        <Link
                          href={`/certificates/editor/${item.certificate_id}`}
                          className="px-3 py-2 min-h-[40px] flex items-center bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-semibold border border-amber-200 transition active:scale-95"
                        >
                          Review Draft
                        </Link>
                      )}

                      {item.certificate_status === "NOT_GENERATED" && (
                        <button
                          onClick={() => handleGenerateCertificate(item.job_id, item.tracking_id)}
                          className="px-3 py-2 min-h-[40px] flex items-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95"
                        >
                          + Generate Cert
                        </button>
                      )}

                      {item.certificate_status === "ERROR" && (
                        <button
                          onClick={() => handleGenerateCertificate(item.job_id, item.tracking_id)}
                          className="px-3 py-2 min-h-[40px] flex items-center bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold border border-rose-200 transition active:scale-95"
                        >
                          Retry
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                      <Link
                        href={`/jobs/${item.job_id}`}
                        className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition active:scale-95"
                        title="View Job"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => setDeleteTarget(item)}
                        disabled={!isAdmin && currentUser?.role !== "fab_shop"}
                        className={`p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition active:scale-95 ${
                          isAdmin || currentUser?.role === "fab_shop"
                            ? "bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer"
                            : "bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed"
                        }`}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Data Table (>=md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3.5 font-semibold">Tracking ID</th>
                    <th className="py-2.5 px-3 font-semibold">Valve Description & Tag</th>
                    <th className="py-2.5 px-3 font-semibold">Origin / Area</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Work Stage</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Certificate</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Certificate Actions</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr key={`${item.job_id}-${item.id || "rec"}`} className="hover:bg-slate-50/60 transition-colors">
                      {/* Tracking ID & Priority */}
                      <td className="py-2.5 px-3.5">
                        <div className="font-mono font-bold text-emerald-800 text-xs flex items-center gap-1.5">
                          <Link href={`/jobs/${item.job_id}`} className="hover:underline">
                            {item.tracking_id}
                          </Link>
                          {item.priority === "EMERGENCY" && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono font-bold uppercase animate-pulse">
                              EMERGENCY
                            </span>
                          )}
                        </div>
                        {item.notification_no && (
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            WO: {item.notification_no}
                          </span>
                        )}
                      </td>

                      {/* Valve Description & Tag */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 line-clamp-1 max-w-[240px]" title={item.valve_description}>
                          {item.valve_description}
                        </div>
                        {item.valve_tag_no && (
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            Tag: {item.valve_tag_no} {item.valve_serial_no ? `· S/N: ${item.valve_serial_no}` : ""}
                          </span>
                        )}
                      </td>

                      {/* Origin / Plant */}
                      <td className="py-2.5 px-3 text-slate-700">
                        <div>
                          {item.source === "EXTERNAL" ? (
                            <span className="text-blue-800 font-medium">{item.customer_name || "External Client"}</span>
                          ) : (
                            <span>{item.plant_name || item.source}</span>
                          )}
                        </div>
                        {item.department_name && (
                          <span className="text-[10px] text-slate-400 block">{item.department_name}</span>
                        )}
                      </td>

                      {/* Work Status */}
                      <td className="py-2.5 px-3 text-center">
                        {renderJobStatusBadge(item.job_status)}
                      </td>

                      {/* Certificate Status Badge */}
                      <td className="py-2.5 px-3 text-center">
                        {renderCertificateBadge(item)}
                      </td>

                      {/* Contextual Certificate Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.certificate_status === "GENERATED" && item.certificate_id && (
                            <>
                              <Link
                                href={`/certificates/editor/${item.certificate_id}`}
                                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[11px] font-semibold border border-emerald-200 transition-colors"
                                title="View official test certificate"
                              >
                                Editor
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDownloadPdf(item.certificate_id!, item.certificate_number || "CERTIFICATE")}
                                disabled={downloadingCertId === item.certificate_id}
                                className="p-1 text-slate-600 hover:text-slate-900 rounded transition-colors disabled:opacity-50"
                                title="Download PDF certificate"
                              >
                                {downloadingCertId === item.certificate_id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}

                          {item.certificate_status === "PENDING_COMPLETION" && item.certificate_id && (
                            <Link
                              href={`/certificates/editor/${item.certificate_id}`}
                              className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded text-[11px] font-semibold border border-amber-200 transition-colors"
                            >
                              Review Draft
                            </Link>
                          )}

                          {item.certificate_status === "NOT_GENERATED" && (
                            <button
                              onClick={() => handleGenerateCertificate(item.job_id, item.tracking_id)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                            >
                              + Generate
                            </button>
                          )}

                          {item.certificate_status === "ERROR" && (
                            <button
                              onClick={() => handleGenerateCertificate(item.job_id, item.tracking_id)}
                              className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[11px] font-semibold border border-rose-200 transition-colors"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Record Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/jobs/${item.job_id}`}
                            className="p-1 text-slate-500 hover:text-slate-900 rounded transition-colors"
                            title="View Valve Job Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => setDeleteTarget(item)}
                            disabled={!isAdmin && currentUser?.role !== "fab_shop"}
                            className={`p-1 rounded transition-colors ${
                              isAdmin || currentUser?.role === "fab_shop"
                                ? "text-slate-400 hover:text-rose-600 cursor-pointer"
                                : "text-slate-200 cursor-not-allowed"
                            }`}
                            title="Delete reclamation record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Delete Reclamation Record"
        message={`Are you sure you want to permanently delete reclamation record ${deleteTarget?.tracking_id} (${deleteTarget?.valve_description})?`}
        confirmLabel={isDeleting ? "Deleting..." : "Permanently Delete"}
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
