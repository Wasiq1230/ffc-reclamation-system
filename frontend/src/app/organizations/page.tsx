"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Factory, Layers, ShieldCheck, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function OrganizationsPage() {
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPlants();
        setPlants(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Plants & Operational Structure"
        description="Fauji Fertilizer Company Ltd. — Rigid structural boundaries separating Plant 1 and Plant 2 units."
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded">
            FFC Complex
          </span>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plants.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-slate-900 text-white font-mono font-bold flex items-center justify-center text-xs">
                  {p.code === "PLANT_1" ? "P1" : "P2"}
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900 tracking-tight">{p.name}</h2>
                  <span className="text-[10px] text-slate-400 font-mono block">{p.code}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                ACTIVE
              </span>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">{p.description}</p>

              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Operating Departments ({p.departments?.length || 0})
                </span>
                <div className="space-y-1.5">
                  {p.departments?.map((d: any) => (
                    <div key={d.id} className="p-2.5 bg-slate-50/75 border border-slate-200 rounded flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800 block">{d.name}</span>
                        <span className="text-[11px] text-slate-500">{d.description}</span>
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                        {d.code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {p.code === "PLANT_2" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] leading-relaxed">
                  <strong>Structural Rule:</strong> Plant 2 contains Ammonia, Urea, and Machinery. Utilities belongs exclusively to Plant 1.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
