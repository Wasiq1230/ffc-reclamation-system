"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  ClipboardCheck,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
  Plus,
  RefreshCw,
  ChevronRight
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function InspectionsHubPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPhase, setFilterPhase] = useState("TESTING");

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.getJobs({ limit: 60 });
      setJobs(data.items || []);
    } catch (err) {
      console.error("Failed to load jobs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const testingJobs = jobs.filter((j) => {
    if (filterPhase === "TESTING") {
      return j.status === "TESTING_QUALITY_INSPECTION" || j.status === "RECLAMATION_IN_PROGRESS";
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Quality Inspection & Hydro Testing"
        description="Hydrostatic pressure verification, seat tightness testing, and QA inspection queue for reclaimed valves."
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
            Form QF-003-05-307 QA
          </span>
        }
        actions={
          <button
            onClick={fetchJobs}
            className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh testing queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        }
      />

      {/* Overview Testing Specifications Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono uppercase">
            <span>Seat Test U/S (Upstream)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-900">Form QF-003 Section 08 Test 1</p>
          <p className="text-[11px] text-slate-500">Hydraulic & pneumatic upstream seat leakage check at working pressure rating.</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono uppercase">
            <span>Seat Test D/S (Downstream)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-900">Form QF-003 Section 08 Test 2</p>
          <p className="text-[11px] text-slate-500">Reverse direction seat leak test verifying bi-directional closure sealing.</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono uppercase">
            <span>Body Shell Hydro Test</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-900">Form QF-003 Section 08 Test 3</p>
          <p className="text-[11px] text-slate-500">1.5× rating hydrostatic shell test ensuring body & bonnet casing integrity.</p>
        </div>
      </div>

      {/* Testing Queue Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Valves Requiring Testing & QA Certification ({testingJobs.length})
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterPhase("TESTING")}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterPhase === "TESTING"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Active Testing Queue
            </button>
            <button
              onClick={() => setFilterPhase("ALL")}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterPhase === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Valves
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-200">
                <th className="py-2.5 px-4 font-semibold">Tracking ID</th>
                <th className="py-2.5 px-4 font-semibold">Origin</th>
                <th className="py-2.5 px-4 font-semibold">Valve Description</th>
                <th className="py-2.5 px-4 font-semibold">Size & Rating</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold text-right">Testing Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                    Loading inspection queue...
                  </td>
                </tr>
              ) : testingJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No valves currently awaiting hydrostatic or pneumatic pressure testing.
                  </td>
                </tr>
              ) : (
                testingJobs.map((j) => {
                  const isEmergency = j.priority === "EMERGENCY";

                  return (
                    <tr key={j.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                        <Link href={`/jobs/${j.id}`} className="hover:underline">
                          {j.tracking_id}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {j.source === "EXTERNAL" ? "External" : `${j.plant_code || j.plant_name} · ${j.department_name || ""}`}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{j.valve_description}</span>
                          {isEmergency && (
                            <span className="text-[9px] font-mono font-bold text-white bg-rose-600 px-1.5 py-0.2 rounded uppercase animate-pulse">
                              Emergency
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{j.size} {j.pressure_rating}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {j.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/jobs/${j.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded font-semibold text-xs shadow-2xs transition-colors"
                        >
                          Log Test <ChevronRight className="w-3 h-3 text-slate-400" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
