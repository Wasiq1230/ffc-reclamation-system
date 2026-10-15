"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Award,
  Search,
  Filter,
  FileText,
  Eye,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Download
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function CertificatesListPage() {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const fetchCerts = async () => {
    setLoading(true);
    try {
      const data = await api.getCertificates({
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
      });
      setCerts(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      console.error("Failed to load certificates", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCerts();
  };

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Valve Reclamation Test Certificates"
        description="Official Form QF-003-05-307 (ANNEXURE-III) test certificate ledger, QA verification, and digital sign-offs."
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
            {total} Issued
          </span>
        }
        actions={
          <button
            onClick={fetchCerts}
            className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh certificates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        }
      />

      {/* Filter Strip */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search certificate, tracking ID, notification..."
            className="w-full pl-9 pr-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 bg-white border border-slate-300 rounded-xl sm:rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 text-base sm:text-xs"
          />
        </form>

        <div className="flex items-center gap-2 self-start md:self-auto w-full sm:w-auto">
          <span className="text-[10px] font-mono uppercase text-slate-400">Status:</span>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="flex-1 sm:flex-initial px-3 py-2 sm:py-1 min-h-[40px] sm:min-h-0 bg-white border border-slate-300 rounded-xl sm:rounded text-sm sm:text-xs font-medium focus:outline-none focus:border-emerald-600 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="AWAITING_REVIEW">Awaiting Review</option>
            <option value="APPROVED">Approved</option>
            <option value="ISSUED">Issued</option>
            <option value="SUPERSEDED">Superseded</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-14 text-center text-slate-400 font-mono text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            <span>Loading certificates...</span>
          </div>
        ) : certs.length === 0 ? (
          <div className="py-14 text-center text-slate-500 px-4">
            <Award className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 text-sm">No certificates found.</p>
          </div>
        ) : (
          <>
            {/* Mobile Stacked Card View (<md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {certs.map((c) => (
                <div key={c.id} className="p-4 space-y-3 active:bg-slate-50/50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/certificates/editor/${c.id}`}
                        className="font-mono font-bold text-sm text-emerald-800 hover:underline flex items-center gap-1.5"
                      >
                        <Award className="w-4 h-4 text-emerald-600" />
                        <span>{c.certificate_number}</span>
                      </Link>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Rev: r{c.revision_number} · Date: {c.certificate_date || "—"}
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                      c.status === "ISSUED" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                      c.status === "APPROVED" ? "bg-sky-50 text-sky-800 border border-sky-200" :
                      c.status === "AWAITING_REVIEW" ? "bg-amber-50 text-amber-900 border border-amber-200" :
                      "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm leading-snug">
                      {c.valve_description}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-slate-600 font-mono">
                      {c.identification_no && (
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 border border-slate-200">
                          Track ID: {c.identification_no}
                        </span>
                      )}
                      {c.notification_no && (
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 border border-slate-200">
                          Notif: {c.notification_no}
                        </span>
                      )}
                      {c.area && (
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 border border-slate-200">
                          {c.area}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <Link
                      href={`/certificates/editor/${c.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 min-h-[44px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold active:scale-95 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Open Editor</span>
                    </Link>
                    <a
                      href={api.getCertificatePdfUrl(c.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold active:scale-95 transition"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                      <span>PDF</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>=md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3.5 font-semibold">Certificate No</th>
                    <th className="py-2.5 px-3 font-semibold">Rev</th>
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold">Identification ID</th>
                    <th className="py-2.5 px-3 font-semibold">Plant / Area</th>
                    <th className="py-2.5 px-3 font-semibold">Notification</th>
                    <th className="py-2.5 px-3 font-semibold">Valve Description</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Status</th>
                    <th className="py-2.5 px-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {certs.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-emerald-800">
                        <Link href={`/certificates/editor/${c.id}`} className="hover:underline">
                          {c.certificate_number}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        r{c.revision_number}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {c.certificate_date}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <Link href={`/jobs/${c.job_id}`} className="text-slate-800 hover:text-emerald-700 font-medium hover:underline">
                          {c.identification_no}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {c.area}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {c.notification_no || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[200px] truncate" title={c.valve_description}>
                        {c.valve_description}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                          c.status === "ISSUED" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                          c.status === "APPROVED" ? "bg-sky-50 text-sky-800 border border-sky-200" :
                          c.status === "AWAITING_REVIEW" ? "bg-amber-50 text-amber-900 border border-amber-200" :
                          "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/certificates/editor/${c.id}`}
                            className="px-2 py-0.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded font-semibold text-xs shadow-2xs transition-colors"
                          >
                            Editor
                          </Link>
                          <a
                            href={api.getCertificatePdfUrl(c.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-600 hover:text-slate-900 rounded transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong>{certs.length}</strong> of <strong>{total}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono">Page {page} of {pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
