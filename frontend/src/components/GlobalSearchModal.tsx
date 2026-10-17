"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FilePlus2,
  ScanLine,
  Camera,
  TableProperties,
  Award,
  BarChart3,
  Factory,
  Building2,
  FileCheck,
  Users2,
  ShieldAlert,
  Settings,
  ArrowRight,
  X,
  Wrench,
  Clock,
  Layers
} from "lucide-react";
import { api } from "@/lib/api";
import { registerCloseHandler } from "@/lib/modalRegistry";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationLinks = [
  { label: "Dashboard", href: "/", category: "Navigation", icon: Layers, keywords: "home overview metrics" },
  { label: "Register Reclamation", href: "/jobs/new", category: "Actions", icon: FilePlus2, keywords: "new create valve entry emergency" },
  { label: "Certificate Scanner", href: "/jobs/scan", category: "Actions", icon: ScanLine, keywords: "ocr camera scan extract certificate" },
  { label: "Valve Photos Gallery", href: "/photos", category: "Navigation", icon: Camera, keywords: "images before after camera visual evidence" },
  { label: "Master Register", href: "/jobs", category: "Navigation", icon: TableProperties, keywords: "jobs all list valves" },
  { label: "Workflow Board", href: "/workflow", category: "Navigation", icon: Clock, keywords: "kanban stages pipeline board" },
  { label: "Inspection & Testing", href: "/inspections", category: "Navigation", icon: Wrench, keywords: "pressure test hydro pneumatic QA" },
  { label: "Certificates Registry", href: "/certificates", category: "Navigation", icon: Award, keywords: "qf-003-05-307 annexure test certs reports" },
  { label: "Reclamation Records", href: "/financials", category: "Navigation", icon: FileCheck, keywords: "records registry tracking verification" },
  { label: "Plants & Departments", href: "/organizations", category: "System", icon: Factory, keywords: "plant 1 plant 2 ammonia urea utilities" },
  { label: "External Customers", href: "/customers", category: "System", icon: Building2, keywords: "clients third party engro fatima" },
  { label: "Reports & Analytics", href: "/reports", category: "System", icon: BarChart3, keywords: "kpi charts performance totals export csv" },
  { label: "Users & Roles", href: "/users", category: "System", icon: Users2, keywords: "accounts staff permissions" },
  { label: "Audit Logs", href: "/audit", category: "System", icon: ShieldAlert, keywords: "security immutable history activity" },
  { label: "System Settings", href: "/settings", category: "System", icon: Settings, keywords: "configuration sequence prefixes numbering policy" },
];

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [jobResults, setJobResults] = useState<any[]>([]);
  const [certResults, setCertResults] = useState<any[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unregister = registerCloseHandler("globalSearchModal", onClose, 10);
    return unregister;
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setJobResults([]);
      setCertResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Live search for jobs and certificates
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setJobResults([]);
      setCertResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const [jobsData, certsData] = await Promise.all([
          api.getJobs({ search: query.trim(), limit: 5 }),
          api.getCertificates({ search: query.trim(), limit: 5 }),
        ]);
        setJobResults(jobsData.items || []);
        setCertResults(certsData.items || []);
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsSearchingApi(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter navigation links
  const filteredNav = navigationLinks.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q)
    );
  });

  const totalResults = filteredNav.length + jobResults.length + certResults.length;

  const handleSelectNav = (href: string) => {
    onClose();
    router.push(href);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            aria-label="Type a command, tracking ID, or certificate number"
            className="w-full text-sm bg-transparent border-0 focus:outline-none text-slate-900"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Search Results Container */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 text-xs">
          {/* Live Search - Reclamation Jobs */}
          {jobResults.length > 0 && (
            <div className="py-2 px-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 mb-1.5">
                Reclamation Jobs ({jobResults.length})
              </p>
              <div className="space-y-0.5">
                {jobResults.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => handleSelectNav(`/jobs/${job.id}`)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50 text-left transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md">
                        <Wrench className="w-3.5 h-3.5 shrink-0" />
                      </div>
                      <div className="truncate">
                        <span className="font-mono font-bold text-emerald-800 mr-2">
                          {job.tracking_id}
                        </span>
                        <span className="text-slate-700">{job.valve_description}</span>
                        {job.priority === "EMERGENCY" && (
                          <span className="ml-2 text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 font-bold border border-rose-300">
                            EMERGENCY
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Search - Certificates */}
          {certResults.length > 0 && (
            <div className="py-2 px-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 mb-1.5">
                Certificates ({certResults.length})
              </p>
              <div className="space-y-0.5">
                {certResults.map((cert) => (
                  <button
                    key={cert.id}
                    onClick={() => handleSelectNav(`/certificates/editor/${cert.id}`)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50 text-left transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 bg-teal-50 text-teal-700 rounded-md">
                        <Award className="w-3.5 h-3.5 shrink-0" />
                      </div>
                      <div className="truncate">
                        <span className="font-mono font-bold text-teal-800 mr-2">
                          {cert.certificate_number}
                        </span>
                        <span className="text-slate-700">{cert.valve_description}</span>
                        <span className="ml-2 text-[10px] text-slate-400 font-mono">
                          Rev {cert.revision_number}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* System Navigation Commands */}
          {filteredNav.length > 0 && (
            <div className="py-2 px-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 mb-1.5">
                Modules & Quick Navigation
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleSelectNav(item.href)}
                      className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50 text-left transition group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 shrink-0" />
                        <span className="font-medium text-slate-700 group-hover:text-slate-900 truncate">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 group-hover:text-slate-600">
                        {item.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty Search State */}
          {totalResults === 0 && !isSearchingApi && (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No matching records or commands found.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Try searching by tracking ID (VR-XXXX), certificate number, or valve description.
              </p>
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>Navigation: Click or Enter</span>
            <span>Close: Esc</span>
          </div>
          <span className="font-mono text-[10px]">FFC Valve Reclamation OS</span>
        </div>
      </div>
    </div>
  );
}
