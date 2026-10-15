"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Wrench,
  Layers,
  Clock,
  CheckCircle2,
  Award,
  AlertTriangle,
  Building,
  FilePlus2,
  ScanLine,
  TableProperties,
  Factory,
  RefreshCw,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Camera
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.ensureAuthenticated();
      const [dashData, jobsData] = await Promise.all([
        api.getDashboard(),
        api.getJobs({ limit: 6 }).catch(() => ({ items: [] })),
      ]);
      setMetrics(dashData);
      setRecentJobs(jobsData.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2.5">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          <p className="text-xs text-slate-500 font-medium">Loading shop metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 sm:p-8 max-w-xl mx-auto my-12">
        <div className="p-5 bg-rose-50/90 border border-rose-200 rounded-2xl text-rose-800 text-xs space-y-3 shadow-xs">
          <p className="font-semibold text-sm">Failed to connect to backend service</p>
          <p className="text-rose-600 leading-relaxed">{error}</p>
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={fetchDashboard}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition cursor-pointer active:scale-95"
            >
              Retry Connection
            </button>
            <Link
              href="/login"
              className="px-4 py-2 bg-white border border-rose-300 hover:bg-rose-50 text-rose-800 rounded-xl font-medium transition cursor-pointer active:scale-95"
            >
              Sign In to Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Top Header */}
      <PageHeader
        title="Fabrication Shop Operations"
        description="Fauji Fertilizer Company Ltd. · Plant 1, Plant 2 & External Reclamation Workload"
        actions={
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={fetchDashboard}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition active:scale-95 shadow-2xs shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Refresh</span>
            </button>
            <Link
              href="/jobs/scan"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition active:scale-95 shadow-2xs shrink-0"
            >
              <ScanLine className="w-3.5 h-3.5 text-slate-400" />
              <span>Certificate Scanner</span>
            </Link>
            <Link
              href="/jobs/new"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition active:scale-95 shadow-xs shrink-0"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Register Valve</span>
            </Link>
          </div>
        }
      />

      {/* Unified Metric Strip (Minimal, continuous layout without boxy card soup) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 overflow-hidden">
        {/* Total Orders */}
        <Link href="/jobs" className="p-3.5 sm:p-5 flex flex-col justify-between hover:bg-slate-50/80 active:bg-slate-100 transition group cursor-pointer active-press">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-slate-700 transition">Total Orders</span>
            <Wrench className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {metrics?.total_jobs || 0}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Tracking files</div>
        </Link>

        {/* Valve Units */}
        <Link href="/jobs" className="p-3.5 sm:p-5 flex flex-col justify-between bg-slate-50/40 hover:bg-slate-50 active:bg-slate-100 transition group cursor-pointer active-press">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-emerald-700 transition">Physical Valves</span>
            <Layers className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-800 tracking-tight">
            {metrics?.total_valve_quantity || 0}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Units in inventory</div>
        </Link>

        {/* In Progress */}
        <Link href="/workflow" className="p-3.5 sm:p-5 flex flex-col justify-between hover:bg-slate-50/80 active:bg-slate-100 transition group cursor-pointer active-press">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-sky-700 transition">Reclamation</span>
            <Clock className="w-4 h-4 text-sky-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-sky-700 tracking-tight">
            {metrics?.jobs_in_progress || 0}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Machining & lapping</div>
        </Link>

        {/* Pressure Testing */}
        <Link href="/inspections" className="p-3.5 sm:p-5 flex flex-col justify-between hover:bg-slate-50/80 active:bg-slate-100 transition group cursor-pointer active-press">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-indigo-700 transition">Hydro Testing</span>
            <Layers className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-700 tracking-tight">
            {metrics?.jobs_in_testing || 0}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">U/S, D/S & body test</div>
        </Link>

        {/* Certificates Issued */}
        <Link href="/certificates" className="p-3.5 sm:p-5 flex flex-col justify-between hover:bg-slate-50/80 active:bg-slate-100 transition group cursor-pointer active-press">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-teal-700 transition">Certified</span>
            <Award className="w-4 h-4 text-teal-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-teal-700 tracking-tight">
            {metrics?.jobs_certificates_issued || 0}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">QF-003-05-307 signed</div>
        </Link>

        {/* Overdue / Emergency */}
        <Link href="/jobs?priority=EMERGENCY" className="p-3.5 sm:p-5 flex flex-col justify-between hover:bg-slate-50/80 active:bg-slate-100 transition group cursor-pointer active-press">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider group-hover:text-rose-700 transition">Emergency / Overdue</span>
            <AlertTriangle className={`w-4 h-4 ${metrics?.jobs_overdue > 0 ? "text-rose-500" : "text-slate-300"}`} />
          </div>
          <div className={`text-xl sm:text-2xl font-bold tracking-tight ${metrics?.jobs_overdue > 0 ? "text-rose-600" : "text-slate-700"}`}>
            {metrics?.jobs_overdue || 0}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">High priority action</div>
        </Link>
      </div>

      {/* Main Content Layout: Plant 1 & Plant 2 Departmental Load */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plant 1 (Fertilizer) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded">
                PLANT 1
              </span>
              <span className="text-xs text-slate-500">
                {metrics?.plant1_metric?.total_jobs || 0} jobs · {metrics?.plant1_metric?.total_valve_qty || 0} valves
              </span>
            </div>
            <Link
              href="/jobs?source=PLANT_1"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 group"
            >
              <span>View register</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {metrics?.plant1_metric?.departments?.map((dept: any) => (
              <div
                key={dept.department_id}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/70 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {dept.department_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                      {dept.department_code}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                    <span className="text-emerald-700 font-medium">{dept.completed_jobs} completed</span>
                    <span>·</span>
                    <span className="text-sky-700 font-medium">{dept.in_progress_jobs} in progress</span>
                    <span>·</span>
                    <span>{dept.certificates_issued} certified</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900 font-mono">
                    {dept.total_jobs}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {dept.total_valve_qty} valve units
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plant 2 (Chemical) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-sky-100 text-sky-800 rounded">
                PLANT 2
              </span>
              <span className="text-xs text-slate-500">
                {metrics?.plant2_metric?.total_jobs || 0} jobs · {metrics?.plant2_metric?.total_valve_qty || 0} valves
              </span>
            </div>
            <Link
              href="/jobs?source=PLANT_2"
              className="text-xs font-semibold text-sky-700 hover:text-sky-800 inline-flex items-center gap-1 group"
            >
              <span>View register</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {metrics?.plant2_metric?.departments?.map((dept: any) => (
              <div
                key={dept.department_id}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/70 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {dept.department_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                      {dept.department_code}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                    <span className="text-emerald-700 font-medium">{dept.completed_jobs} completed</span>
                    <span>·</span>
                    <span className="text-sky-700 font-medium">{dept.in_progress_jobs} in progress</span>
                    <span>·</span>
                    <span>{dept.certificates_issued} certified</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900 font-mono">
                    {dept.total_jobs}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {dept.total_valve_qty} valve units
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50/60 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-2 px-5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>Plant 2 covers Ammonia, Urea, and Machinery. Utilities belongs to Plant 1.</span>
          </div>
        </div>
      </div>

      {/* External Customers / Miscellaneous Workload */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Building className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900">External Client Workload</h3>
          </div>
          <Link
            href="/customers"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 group"
          >
            <span>Manage customers</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium">External Jobs</span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-1">
              {metrics?.external_metric?.total_jobs || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {metrics?.external_metric?.total_valve_qty || 0} valves from external plants
            </p>
          </div>

          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium">Completed & Certified</span>
            <div className="text-xl font-bold text-emerald-700 font-mono mt-1">
              {metrics?.external_metric?.certificates_issued || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {metrics?.external_metric?.completed_jobs || 0} jobs delivered
            </p>
          </div>

          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium">Active External Accounts</span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-1">
              {metrics?.external_metric?.customers?.length || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Registered corporate clients
            </p>
          </div>
        </div>
      </div>

      {/* Recent Reclamation Operations (Real Database Records) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TableProperties className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Recent Valve Reclamation Operations</h3>
          </div>
          <Link
            href="/jobs"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 group"
          >
            <span>View full master register</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No reclamation jobs recorded yet. Register your first valve to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-5 py-3">Tracking ID</th>
                  <th className="px-4 py-3">Valve Description & Tag</th>
                  <th className="px-4 py-3">Origin / Plant</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3 font-mono font-bold text-slate-900">
                      <Link href={`/jobs/${job.id}`} className="hover:text-emerald-700 transition">
                        {job.tracking_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 truncate max-w-xs">
                        {job.valve_description || "Industrial Valve"}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Tag: {job.valve_tag_no || "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {job.source === "PLANT_1" ? "Plant 1" : job.source === "PLANT_2" ? "Plant 2" : job.customer?.name || "External"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                        {job.current_stage?.replace(/_/g, " ") || "Received"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {job.priority === "EMERGENCY" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          EMERGENCY
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Normal</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
