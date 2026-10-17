"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  TableProperties,
  Search,
  Filter,
  Download,
  FilePlus2,
  Eye,
  CheckCircle2,
  Clock,
  Layers,
  Award,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Edit3,
  Trash2,
  AlertCircle,
  X,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ConfirmModal from "@/components/ConfirmModal";

export default function MasterRegisterPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [pages, setPages] = useState(1);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteJob(deleteTarget.id);
      setActionMessage(`Reclamation entry ${deleteTarget.tracking_id} successfully deleted.`);
      setTimeout(() => setActionMessage(null), 4000);
      setDeleteTarget(null);
      fetchJobs();
    } catch (err: any) {
      setActionMessage("Error deleting entry: " + (err.message || "Unknown error"));
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.getJobs({
        page,
        limit,
        search: search || undefined,
        source: source || undefined,
        status: status || undefined,
        priority: priority || undefined,
      });
      setJobs(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      console.error("Failed to load jobs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, source, status, priority]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const getStatusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      RECEIVED: { label: "Received", cls: "bg-slate-100 text-slate-700 border-slate-200" },
      REGISTERED: { label: "Registered", cls: "bg-blue-50 text-blue-700 border-blue-200" },
      INSPECTION_IN_PROGRESS: { label: "Inspecting", cls: "bg-amber-50 text-amber-700 border-amber-200" },
      AWAITING_APPROVAL_PARTS: { label: "Parts Hold", cls: "bg-orange-50 text-orange-700 border-orange-200" },
      RECLAMATION_IN_PROGRESS: { label: "Reclamation", cls: "bg-sky-50 text-sky-700 border-sky-200" },
      TESTING_QUALITY_INSPECTION: { label: "Hydro Testing", cls: "bg-purple-50 text-purple-700 border-purple-200" },
      COMPLETED: { label: "Completed", cls: "bg-teal-50 text-teal-700 border-teal-200" },
      CERTIFICATE_ISSUED: { label: "Cert Issued", cls: "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold" },
      READY_FOR_DELIVERY: { label: "Ready", cls: "bg-blue-50 text-blue-800 border-blue-200" },
      DELIVERED: { label: "Delivered", cls: "bg-slate-100 text-slate-800 border-slate-300" },
      ON_HOLD: { label: "On Hold", cls: "bg-rose-50 text-rose-700 border-rose-200" },
      CANCELLED: { label: "Cancelled", cls: "bg-red-50 text-red-700 border-red-200" },
    };
    const conf = map[s] || { label: s?.replace(/_/g, " ") || "Active", cls: "bg-slate-100 text-slate-700 border-slate-200" };
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${conf.cls}`}>
        {conf.label}
      </span>
    );
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Master Reclamation Register"
        description="Permanent auditable ledger of all registered valves, plant origins, testing records, and certificates."
        badge={
          <span className="px-2.5 py-0.5 text-xs font-mono font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
            {total} records
          </span>
        }
        actions={
          <>
            <a
              href="http://127.0.0.1:8000/api/jobs/export/csv"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>CSV</span>
            </a>
            <a
              href="http://127.0.0.1:8000/api/jobs/export/excel"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </a>
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-2xs"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Register Valve</span>
            </Link>
          </>
        }
      />

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      {/* Filter Toolbar */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 sm:top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              aria-label="Search tracking ID, notification no, tag no, description"
              className="w-full pl-10 pr-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm sm:text-xs font-semibold active:scale-95 transition shadow-xs"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Filters:
          </span>

          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 sm:py-1 min-h-[40px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-lg text-sm sm:text-xs text-slate-700 font-medium focus:outline-none"
          >
            <option value="">All Sources</option>
            <option value="PLANT_1">FFC Plant 1</option>
            <option value="PLANT_2">FFC Plant 2</option>
            <option value="EXTERNAL">External Clients</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 sm:py-1 min-h-[40px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-lg text-sm sm:text-xs text-slate-700 font-medium focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="REGISTERED">Registered</option>
            <option value="INSPECTION_IN_PROGRESS">Inspection</option>
            <option value="RECLAMATION_IN_PROGRESS">In Reclamation</option>
            <option value="TESTING_QUALITY_INSPECTION">Hydro Testing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CERTIFICATE_ISSUED">Cert Issued</option>
            <option value="DELIVERED">Delivered</option>
            <option value="ON_HOLD">On Hold</option>
          </select>

          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 sm:py-1 min-h-[40px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-lg text-sm sm:text-xs text-slate-700 font-medium focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="EMERGENCY">Emergency Only</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>

          {(source || status || priority || search) && (
            <button
              onClick={() => {
                setSource("");
                setStatus("");
                setPriority("");
                setSearch("");
                setPage(1);
              }}
              className="text-xs text-rose-600 hover:underline font-semibold ml-auto py-1 px-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main Data Container: Cards on Mobile (<md), 10-Column Spreadsheet on Desktop (>=md) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-14 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs font-medium">Loading reclamation register...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-14 text-center text-slate-400 px-4">
            <TableProperties className="w-9 h-9 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">No reclamation records found.</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Adjust your filters or register a new valve job.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Stacked Card View (<md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {jobs.map((j) => (
                <div key={j.id} className="p-4 space-y-3 active:bg-slate-50/50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/jobs/${j.id}`} className="font-mono font-bold text-sm text-emerald-700 hover:underline">
                        {j.tracking_id}
                      </Link>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {j.created_at ? j.created_at.split("T")[0] : "—"} · Qty: {j.quantity || 1}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {getStatusBadge(j.status)}
                      {j.priority === "EMERGENCY" && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-black border border-rose-300">
                          EMERGENCY
                        </span>
                      )}
                      {j.priority === "URGENT" && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                          URGENT
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm leading-snug">
                      {j.valve_description || "Industrial Valve"}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-slate-600 font-mono">
                      {j.valve_tag_no && (
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 border border-slate-200">
                          Tag: {j.valve_tag_no}
                        </span>
                      )}
                      {j.notification_no && (
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 border border-slate-200">
                          Notif: {j.notification_no}
                        </span>
                      )}
                      {(j.size || j.pressure_rating) && (
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 border border-slate-200">
                          {j.size} {j.pressure_rating}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <div className="truncate text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-800">
                        {j.source === "EXTERNAL" ? (j.customer_name || "External Client") : (j.plant_name || j.source)}
                      </span>
                      {j.department_name && <span className="text-slate-400"> · {j.department_name}</span>}
                    </div>
                    {j.latest_certificate_number && (
                      <Link
                        href={`/certificates/editor/${j.latest_certificate_id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold font-mono shrink-0 ml-2"
                      >
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{j.latest_certificate_number}</span>
                      </Link>
                    )}
                  </div>

                  {/* Thumb-friendly mobile card action buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <Link
                      href={`/jobs/${j.id}`}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 min-h-[44px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 active:scale-95 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View</span>
                    </Link>
                    <Link
                      href={`/jobs/edit/${j.id}`}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 min-h-[44px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 active:scale-95 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Edit</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(j)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 min-h-[44px] bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 active:scale-95 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Spreadsheet Table View (>=md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Tracking ID & Priority</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Source & Location</th>
                    <th className="py-3 px-3">Notification</th>
                    <th className="py-3 px-3">Valve Description</th>
                    <th className="py-3 px-3">Tag / Serial</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Certificate</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-emerald-700 text-xs">
                          <Link href={`/jobs/${j.id}`} className="hover:underline flex items-center gap-1.5">
                            <span>{j.tracking_id}</span>
                            {j.priority === "EMERGENCY" && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-black border border-rose-300 tracking-wider">
                                EMERGENCY
                              </span>
                            )}
                            {j.priority === "URGENT" && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                                URGENT
                              </span>
                            )}
                          </Link>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {j.created_at ? j.created_at.split("T")[0] : "—"}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">
                          {j.source === "EXTERNAL"
                            ? j.customer_name || "External Client"
                            : j.plant_name || j.source}
                        </div>
                        {j.department_name && (
                          <div className="text-[10px] text-slate-400">{j.department_name}</div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                        {j.notification_no || "—"}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900 max-w-[200px] truncate" title={j.valve_description}>
                          {j.valve_description}
                        </div>
                        {(j.size || j.pressure_rating) && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {j.size} {j.pressure_rating}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                        {j.valve_tag_no || "—"}
                        {j.valve_serial_no && (
                          <span className="block text-[10px] text-slate-400">
                            S/N: {j.valve_serial_no}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-800 font-mono">
                        {j.quantity || 1}
                      </td>

                      <td className="py-3 px-3">
                        {getStatusBadge(j.status)}
                      </td>

                      <td className="py-3 px-3">
                        {j.latest_certificate_number ? (
                          <Link
                            href={`/certificates/editor/${j.latest_certificate_id}`}
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 hover:underline font-semibold"
                          >
                            <Award className="w-3 h-3 text-emerald-600" />
                            <span>{j.latest_certificate_number}</span>
                          </Link>
                        ) : (
                          <Link
                            href={`/jobs/${j.id}`}
                            className="text-[10px] text-slate-400 hover:text-emerald-700 transition"
                          >
                            + Create Cert
                          </Link>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/jobs/${j.id}`}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
                            title="View valve detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href={`/jobs/edit/${j.id}`}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition"
                            title="Edit valve entry"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(j)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            title="Delete valve entry"
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

        {/* Pagination Bar with thumb-friendly buttons */}
        {pages > 1 && (
          <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {pages} ({total} items)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Reclamation Entry"
        message={`Are you sure you want to delete reclamation entry ${deleteTarget?.tracking_id}? This action cannot be undone.`}
        details={
          deleteTarget && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Valve:</span>
                <span className="font-medium text-slate-800">{deleteTarget.valve_description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tracking:</span>
                <span className="font-mono text-emerald-800">{deleteTarget.tracking_id}</span>
              </div>
            </div>
          )
        }
        confirmLabel="Yes, Delete Entry"
        isLoading={isDeleting}
        isDestructive={true}
      />
    </div>
  );
}
