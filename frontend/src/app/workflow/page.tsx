"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  KanbanSquare,
  Clock,
  Layers,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Building2,
  Eye,
  Filter,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

const WORKFLOW_COLUMNS = [
  { key: "RECEIVED", label: "Received / Registered", statuses: ["RECEIVED", "REGISTERED"] },
  { key: "INSPECTION_IN_PROGRESS", label: "Initial Inspection", statuses: ["INSPECTION_IN_PROGRESS"] },
  { key: "AWAITING_APPROVAL_PARTS", label: "Awaiting Parts", statuses: ["AWAITING_APPROVAL_PARTS"] },
  { key: "RECLAMATION_IN_PROGRESS", label: "Reclamation Work", statuses: ["RECLAMATION_IN_PROGRESS"] },
  { key: "TESTING_QUALITY_INSPECTION", label: "Hydro Testing / QA", statuses: ["TESTING_QUALITY_INSPECTION"] },
  { key: "COMPLETED", label: "Work Completed", statuses: ["COMPLETED"] },
  { key: "CERTIFICATE_ISSUED", label: "Certified (QF-003)", statuses: ["CERTIFICATE_ISSUED"] },
  { key: "DELIVERED", label: "Ready / Delivered", statuses: ["READY_FOR_DELIVERY", "DELIVERED"] },
];

export default function WorkflowBoardPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [emergencyOnly, setEmergencyOnly] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.getJobs({ limit: 120 });
      setJobs(data.items || []);
    } catch (err) {
      console.error("Failed to load workflow jobs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter((j) => {
    if (sourceFilter !== "ALL" && j.source !== sourceFilter) return false;
    if (emergencyOnly && j.priority !== "EMERGENCY" && j.priority !== "URGENT") return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Reclamation Workflow Board"
        description="Live operational pipeline tracking valves from receipt through dismantling, machining, hydro testing, certification, and dispatch."
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded">
            {filteredJobs.length} Valves in Pipeline
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchJobs}
              className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Refresh pipeline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/jobs/new"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-2xs transition-colors"
            >
              + Register Valve
            </Link>
          </div>
        }
      />

      {/* Filter Strip */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-mono uppercase text-[10px]">Filter Plant:</span>
          {["ALL", "PLANT_1", "PLANT_2", "EXTERNAL"].map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                sourceFilter === src
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {src === "ALL"
                ? "All Plants"
                : src === "PLANT_1"
                ? "Plant 1"
                : src === "PLANT_2"
                ? "Plant 2"
                : "External"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEmergencyOnly(!emergencyOnly)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              emergencyOnly
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
            }`}
          >
            <span>🚨</span>
            <span>Emergency / Urgent Only</span>
          </button>
        </div>
      </div>

      {/* Kanban Horizontal Board */}
      <div className="flex gap-3.5 overflow-x-auto pb-6 pt-1">
        {WORKFLOW_COLUMNS.map((col) => {
          const colJobs = filteredJobs.filter((j) => col.statuses.includes(j.status));

          return (
            <div
              key={col.key}
              className="w-72 shrink-0 bg-slate-50 border border-slate-200 rounded-lg flex flex-col max-h-[78vh] shadow-2xs"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-lg">
                <span className="font-bold text-xs text-slate-900 tracking-wide uppercase">
                  {col.label}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {colJobs.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-2.5 space-y-2 overflow-y-auto flex-1">
                {colJobs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    No valves in this phase
                  </div>
                ) : (
                  colJobs.map((j) => {
                    const isEmergency = j.priority === "EMERGENCY";
                    const isUrgent = j.priority === "URGENT";

                    return (
                      <div
                        key={j.id}
                        className={`p-3 bg-white rounded border transition-all text-xs space-y-2 ${
                          isEmergency
                            ? "border-rose-400 ring-1 ring-rose-200"
                            : isUrgent
                            ? "border-amber-400"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/jobs/${j.id}`}
                            className="font-mono font-bold text-emerald-800 hover:underline text-xs"
                          >
                            {j.tracking_id}
                          </Link>

                          {isEmergency && (
                            <span className="text-[9px] font-mono font-bold text-white bg-rose-600 px-1.5 py-0.5 rounded uppercase animate-pulse">
                              Emergency
                            </span>
                          )}
                          {isUrgent && !isEmergency && (
                            <span className="text-[9px] font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded uppercase">
                              Urgent
                            </span>
                          )}
                        </div>

                        <p className="font-semibold text-slate-900 line-clamp-2 text-xs leading-snug">
                          {j.valve_description}
                        </p>

                        <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                          <span>
                            {j.source === "EXTERNAL" ? "External" : `${j.plant_code || j.plant_name} · ${j.department_name || ""}`}
                          </span>
                          {j.valve_tag_no && (
                            <span className="text-slate-700 font-medium">Tag: {j.valve_tag_no}</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                          <span>Qty: <strong>{j.valve_quantity}</strong></span>
                          <Link
                            href={`/jobs/${j.id}`}
                            className="text-slate-700 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
                          >
                            Details <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
