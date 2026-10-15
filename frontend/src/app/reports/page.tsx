"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart3,
  Factory,
  Building,
  FileSpreadsheet,
  FileText,
  Calendar,
  Layers,
  Wrench,
  Award,
  RefreshCw,
  Download
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboard(dateFrom || undefined, dateTo || undefined);
      setMetrics(data);
    } catch (err) {
      console.error("Failed to load report data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports();
  };

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Reports & Analytics Ledger"
        description="Disaggregated operational metrics for FFC Plant 1, Plant 2, and external customer reclamation throughput."
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
            Live Metrics
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <a
              href="http://127.0.0.1:8000/api/jobs/export/csv"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              CSV
            </a>
            <a
              href="http://127.0.0.1:8000/api/jobs/export/excel"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel
            </a>
          </div>
        }
      />

      {/* Date Range Filter Bar */}
      <form
        onSubmit={handleFilterSubmit}
        className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-700">Date Range:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-mono text-[11px]">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-mono text-[11px]">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-emerald-600"
            />
          </div>

          <button
            type="submit"
            className="px-3 py-1 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs"
          >
            Apply
          </button>

          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDateFrom(""); setDateTo(""); fetchReports(); }}
              className="text-rose-600 hover:underline font-semibold ml-1 text-xs"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Disaggregated Plant 1 Report Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Factory className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              FFC Plant 1 Departmental Throughput
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-800">
            Jobs: {metrics?.plant1_metric?.total_jobs || 0} · Valves: {metrics?.plant1_metric?.total_valve_qty || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-4 font-semibold">Department</th>
                <th className="py-2.5 px-3 font-semibold">Code</th>
                <th className="py-2.5 px-3 text-center font-semibold">Jobs</th>
                <th className="py-2.5 px-3 text-center font-semibold">Quantity</th>
                <th className="py-2.5 px-3 text-center font-semibold">In Progress</th>
                <th className="py-2.5 px-3 text-center font-semibold">Completed</th>
                <th className="py-2.5 px-4 text-center font-semibold">Certificates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics?.plant1_metric?.departments?.map((d: any) => (
                <tr key={d.department_id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{d.department_name}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{d.department_code}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">{d.total_jobs}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-800">{d.total_valve_qty}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">{d.in_progress_jobs}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">{d.completed_jobs}</td>
                  <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-700">{d.certificates_issued}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disaggregated Plant 2 Report Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Factory className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              FFC Plant 2 Departmental Throughput
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-slate-800">
            Jobs: {metrics?.plant2_metric?.total_jobs || 0} · Valves: {metrics?.plant2_metric?.total_valve_qty || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-4 font-semibold">Department</th>
                <th className="py-2.5 px-3 font-semibold">Code</th>
                <th className="py-2.5 px-3 text-center font-semibold">Jobs</th>
                <th className="py-2.5 px-3 text-center font-semibold">Quantity</th>
                <th className="py-2.5 px-3 text-center font-semibold">In Progress</th>
                <th className="py-2.5 px-3 text-center font-semibold">Completed</th>
                <th className="py-2.5 px-4 text-center font-semibold">Certificates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics?.plant2_metric?.departments?.map((d: any) => (
                <tr key={d.department_id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{d.department_name}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{d.department_code}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">{d.total_jobs}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">{d.total_valve_qty}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">{d.in_progress_jobs}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">{d.completed_jobs}</td>
                  <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700">{d.certificates_issued}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automatic Totals Reconciliation */}
      <div className="p-4 bg-slate-900 text-white rounded-lg shadow-2xs space-y-3">
        <span className="text-[10px] font-mono uppercase text-emerald-400 block tracking-wider font-bold">
          Executive Aggregate Reconciliation
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] font-mono uppercase">FFC Plant 1 Jobs</span>
            <span className="text-xl font-bold font-mono text-white">{metrics?.plant1_metric?.total_jobs || 0}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-mono uppercase">FFC Plant 2 Jobs</span>
            <span className="text-xl font-bold font-mono text-white">{metrics?.plant2_metric?.total_jobs || 0}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-mono uppercase">External Client Jobs</span>
            <span className="text-xl font-bold font-mono text-white">{metrics?.external_metric?.total_jobs || 0}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-mono uppercase">Total Reclamations</span>
            <span className="text-xl font-bold font-mono text-emerald-400">{metrics?.total_jobs || 0}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-mono uppercase">Total Valve Units</span>
            <span className="text-xl font-bold font-mono text-white">{metrics?.total_valve_quantity || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
