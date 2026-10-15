"use client";

import { useEffect, useState } from "react";
import { api, getStoredUser } from "@/lib/api";
import { ShieldAlert, Search, Filter, Clock, User, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    async function load() {
      try {
        const data = await api.getAuditLogs({ limit: 50 });
        setLogs(data.items || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Audit Trail & System Logs"
        description="Immutable chronological log of job registrations, status transitions, certificate approvals, and administrative actions."
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded">
            {total} Events
          </span>
        }
      />

      {!isAdmin ? (
        <div className="p-8 max-w-md mx-auto text-center space-y-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
          <ShieldAlert className="w-8 h-8 mx-auto text-amber-500" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Administrator Clearance Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Audit trail records are restricted to users with system administrator role.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">User</th>
                  <th className="py-2.5 px-3 font-semibold">Action</th>
                  <th className="py-2.5 px-3 font-semibold">Entity</th>
                  <th className="py-2.5 px-3 font-semibold">Record ID</th>
                  <th className="py-2.5 px-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                      Loading audit events...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition-colors font-mono text-[11px]">
                      <td className="py-2.5 px-4 text-slate-500">{new Date(l.timestamp).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{l.username}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          l.action === "CREATE" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                          l.action === "ISSUE" ? "bg-purple-50 text-purple-800 border border-purple-200" :
                          l.action === "APPROVE" ? "bg-sky-50 text-sky-800 border border-sky-200" :
                          l.action === "STATUS_CHANGE" ? "bg-amber-50 text-amber-900 border border-amber-200" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {l.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-sans">{l.entity_name}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{l.entity_id}</td>
                      <td className="py-2.5 px-4 text-slate-600 truncate max-w-xs font-sans text-xs" title={l.details}>
                        {l.details || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
