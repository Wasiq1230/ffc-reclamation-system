"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, getStoredUser } from "@/lib/api";
import {
  Award,
  Save,
  Send,
  CheckCircle,
  FileDown,
  Printer,
  History,
  AlertCircle,
  ArrowLeft,
  Eye,
  Edit3,
  PenTool
} from "lucide-react";
import SignatureCanvas from "@/components/SignatureCanvas";

export default function CertificateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const certId = Number(params.id);

  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("preview");

  // Form State
  const [formData, setFormData] = useState<any>({});
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Revise modal
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");

  // Signature modal
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  const fetchCert = async () => {
    setLoading(true);
    try {
      const data = await api.getCertificate(certId);
      setCert(data);
      setFormData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load certificate");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUser(getStoredUser());
    if (certId) fetchCert();
  }, [certId]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateCertificate(certId, formData);
      setCert(updated);
      alert("Draft saved successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    try {
      await api.updateCertificate(certId, formData);
      const res = await api.submitCertificate(certId);
      setCert(res);
      alert("Certificate submitted for Quality Review.");
    } catch (err: any) {
      alert("Submission error: " + err.message);
    }
  };

  const handleApprove = async () => {
    try {
      const res = await api.approveCertificate(certId);
      setCert(res);
      alert("Certificate approved.");
    } catch (err: any) {
      alert("Approval error: " + err.message);
    }
  };

  const handleIssue = async () => {
    if (!confirm("Are you sure you want to officially issue this certificate? This will lock this version and generate the formal PDF.")) return;
    try {
      await api.updateCertificate(certId, formData);
      const res = await api.issueCertificate(certId);
      setCert(res);
      alert("Certificate officially ISSUED! ReportLab vector PDF generated.");
    } catch (err: any) {
      alert("Issue error: " + err.message);
    }
  };

  const handleRevise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionReason.trim()) {
      alert("Please state the reason for revision.");
      return;
    }
    try {
      const newRev = await api.reviseCertificate(certId, revisionReason, formData);
      setShowReviseModal(false);
      alert(`Revision created: ${newRev.certificate_number} (Rev ${newRev.revision_number})`);
      router.push(`/certificates/editor/${newRev.id}`);
    } catch (err: any) {
      alert("Revision error: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error && !cert) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
          <p className="font-semibold">Error Loading Certificate</p>
          <p className="text-xs mt-1">{error}</p>
          <Link href="/certificates" className="mt-3 inline-block px-3 py-1 bg-rose-600 text-white rounded text-xs">
            Return to Certificates
          </Link>
        </div>
      </div>
    );
  }

  const isIssued = cert.status === "ISSUED";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Top Action Ribbon (no-print) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 font-mono">
            <Link href="/certificates" className="hover:text-slate-900 transition-colors">Certificates</Link>
            <span>/</span>
            <span className="font-bold text-emerald-800">{cert.certificate_number}</span>
            <span>(Rev {cert.revision_number})</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-950 tracking-tight">
              {cert.form_title}
            </h1>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
              cert.status === "ISSUED" ? "bg-emerald-600 text-white" :
              cert.status === "APPROVED" ? "bg-sky-600 text-white" :
              cert.status === "AWAITING_REVIEW" ? "bg-amber-500 text-white" :
              "bg-slate-900 text-white"
            }`}>
              {cert.status}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Toggle Tab */}
          <div className="flex border border-slate-300 rounded overflow-hidden bg-white shadow-2xs">
            <button
              onClick={() => setActiveTab("form")}
              className={`px-3 py-1.5 flex items-center gap-1.5 font-medium transition-colors ${
                activeTab === "form" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editor Form
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 flex items-center gap-1.5 font-medium transition-colors ${
                activeTab === "preview" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Live A4 Preview
            </button>
          </div>

          {!isIssued && (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded font-semibold hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                Save Draft
              </button>

              {cert.status === "DRAFT" && (
                <button
                  onClick={handleSubmitForReview}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Review
                </button>
              )}

              {["DRAFT", "AWAITING_REVIEW"].includes(cert.status) && (
                <button
                  onClick={handleApprove}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Approve
                </button>
              )}

              <button
                onClick={handleIssue}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Award className="w-3.5 h-3.5" />
                Issue Certificate
              </button>
            </>
          )}

          {isIssued && (
            <button
              onClick={() => setShowReviseModal(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              Create Revision
            </button>
          )}

          <a
            href={`http://127.0.0.1:8000/api/certificates/${cert.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            Download PDF
          </a>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded font-semibold hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print
          </button>
        </div>
      </div>

      {isIssued && (
        <div className="no-print p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Official Record:</strong> This certificate is officially ISSUED and locked. Any engineering modification must use the controlled revision workflow.
          </span>
        </div>
      )}

      {/* VIEW: LIVE A4 PREVIEW (Faithful reproduction of QF-003-05-307) */}
      {(activeTab === "preview" || true) && (
        <div className={activeTab === "form" ? "hidden" : "block"}>
          <div className="certificate-preview-box">
            {/* Top Outer Border Envelope */}
            <div className="border-2 border-black p-4 space-y-3 min-h-[270mm] flex flex-col justify-between text-black">
              {/* HEADER */}
              <div>
                <div className="flex items-start justify-between pb-2 border-b-2 border-black">
                  <div>
                    <h2 className="text-sm font-bold font-sans tracking-wider">{cert.annexure || "ANNEXURE-III"}</h2>
                    <p className="text-[11px] font-sans">Date: {cert.form_ref_date || "13-05-2025"}</p>
                  </div>

                  <div className="text-center flex-1 px-4">
                    <h1 className="text-base font-black uppercase tracking-tight">
                      VALVE RECLAMATION TEST CERTIFICATE
                    </h1>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold leading-tight">FAUJI FERTILIZER COMPANY LTD.</p>
                    <p className="text-[10px] leading-tight">Fabrication Shop — Goth Machhi</p>
                    <p className="text-[10px] font-bold font-mono">Ref: {cert.form_reference || "QF-003-05-307"}</p>
                  </div>
                </div>

                {/* IDENTIFICATION FIELDS GRID */}
                <div className="py-2.5 border-b border-black text-xs space-y-1.5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[11px]">IDENTIFICATION NO:</span>
                      <span className="font-mono font-semibold underline underline-offset-2">{formData.identification_no || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="font-bold text-[11px]">DATE:</span>
                      <span className="underline underline-offset-2">{formData.certificate_date || "—"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[11px]">AREA:</span>
                      <span className="font-semibold underline underline-offset-2">{formData.area || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="font-bold text-[11px]">Notification No:</span>
                      <span className="font-mono underline underline-offset-2">{formData.notification_no || "—"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[11px]">VALVE DESCRIPTION:</span>
                    <span className="font-semibold underline underline-offset-2">{formData.valve_description || "—"}</span>
                  </div>
                </div>

                {/* RECLAMATION STATUS */}
                <div className="py-2 border-b-2 border-black text-xs">
                  <h3 className="font-black text-xs uppercase mb-2">RECLAMATION STATUS:</h3>

                  <div className="space-y-2 text-[11px]">
                    {/* 01. Body Seat */}
                    <div className="flex items-center gap-6 py-1 border-b border-black/30">
                      <span className="font-bold w-44">01. Body Seat</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.body_seat_stellited} onChange={(e) => handleFieldChange("body_seat_stellited", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Stellited</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.body_seat_machined} onChange={(e) => handleFieldChange("body_seat_machined", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Machined</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.body_seat_lapped} onChange={(e) => handleFieldChange("body_seat_lapped", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Lapped</span>
                      </label>
                    </div>

                    {/* 02. Gate / Disc / Plug (Replaced warehouse code with Stellite, Machined, Lapped condition checkboxes) */}
                    <div className="flex items-center gap-6 py-1 border-b border-black/30">
                      <span className="font-bold w-44">02. Gate / Disc / Plug</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.gate_disc_plug_stellited} onChange={(e) => handleFieldChange("gate_disc_plug_stellited", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Stellite</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.gate_disc_plug_machined} onChange={(e) => handleFieldChange("gate_disc_plug_machined", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Machined</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.gate_disc_plug_lapped} onChange={(e) => handleFieldChange("gate_disc_plug_lapped", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Lapped</span>
                      </label>
                    </div>

                    {/* 03. Back Seat (Stem Bushing) */}
                    <div className="flex items-center gap-6 py-1 border-b border-black/30">
                      <span className="font-bold w-44">03. Back Seat (Stem Bushing)</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.back_seat_bushing_stellited} onChange={(e) => handleFieldChange("back_seat_bushing_stellited", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Stellited</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.back_seat_bushing_machined} onChange={(e) => handleFieldChange("back_seat_bushing_machined", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Machined</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.back_seat_bushing_lapped} onChange={(e) => handleFieldChange("back_seat_bushing_lapped", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Lapped</span>
                      </label>
                    </div>

                    {/* 04. Back Seat (Stem) */}
                    <div className="flex items-center gap-6 py-1 border-b border-black/30">
                      <span className="font-bold w-44">04. Back Seat (Stem)</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.back_seat_stem_stellited} onChange={(e) => handleFieldChange("back_seat_stem_stellited", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Stellited</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.back_seat_stem_machined} onChange={(e) => handleFieldChange("back_seat_stem_machined", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Machined</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.back_seat_stem_lapped} onChange={(e) => handleFieldChange("back_seat_stem_lapped", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Lapped</span>
                      </label>
                    </div>

                    {/* 05. Stem */}
                    <div className="flex items-center gap-6 py-1 border-b border-black/30">
                      <span className="font-bold w-44">05. Stem</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.stem_built_up} onChange={(e) => handleFieldChange("stem_built_up", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Built-up</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.stem_machined} onChange={(e) => handleFieldChange("stem_machined", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Machined</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={!!formData.stem_polish} onChange={(e) => handleFieldChange("stem_polish", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                        <span>Polish</span>
                      </label>
                    </div>

                    {/* 06. Gland Packing (Manual Entry + Predefined Options) */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-5 py-1 border-b border-black/30">
                      <span className="font-bold w-44">06. Gland Packing</span>
                      <div className="flex items-center gap-1.5">
                        <span>W.Code:</span>
                        <input
                          type="text"
                          value={formData.gland_packing_warehouse_code || ""}
                          onChange={(e) => handleFieldChange("gland_packing_warehouse_code", e.target.value)}
                          disabled={isIssued}
                          placeholder="e.g. GP-881"
                          className="px-1.5 py-0.5 border border-black/60 rounded text-[11px] font-mono w-24"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">Spec / Material:</span>
                        <input
                          type="text"
                          value={formData.gland_packing_specification || ""}
                          onChange={(e) => handleFieldChange("gland_packing_specification", e.target.value)}
                          disabled={isIssued}
                          placeholder="Manual entry: spec or description"
                          className="px-1.5 py-0.5 border border-black/60 rounded text-[11px] w-52"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={!!formData.gland_packing_comp_rpr} onChange={(e) => handleFieldChange("gland_packing_comp_rpr", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                          <span>Comp. Rpr</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={!!formData.gland_packing_partl_rpr} onChange={(e) => handleFieldChange("gland_packing_partl_rpr", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                          <span>Part'l Rpr</span>
                        </label>
                      </div>
                    </div>

                    {/* 07. Bonnet Gasket (Manual Entry + Predefined Options) */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-5 py-1">
                      <span className="font-bold w-44">07. Bonnet Gasket</span>
                      <div className="flex items-center gap-1.5">
                        <span>W.Code:</span>
                        <input
                          type="text"
                          value={formData.bonnet_gasket_warehouse_code || ""}
                          onChange={(e) => handleFieldChange("bonnet_gasket_warehouse_code", e.target.value)}
                          disabled={isIssued}
                          placeholder="e.g. BG-201"
                          className="px-1.5 py-0.5 border border-black/60 rounded text-[11px] font-mono w-24"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">Spec / Material:</span>
                        <input
                          type="text"
                          value={formData.bonnet_gasket_specification || ""}
                          onChange={(e) => handleFieldChange("bonnet_gasket_specification", e.target.value)}
                          disabled={isIssued}
                          placeholder="Manual entry: gasket type or spec"
                          className="px-1.5 py-0.5 border border-black/60 rounded text-[11px] w-52"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={!!formData.bonnet_gasket_new} onChange={(e) => handleFieldChange("bonnet_gasket_new", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                          <span>New</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={!!formData.bonnet_gasket_old} onChange={(e) => handleFieldChange("bonnet_gasket_old", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                          <span>Old</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={!!formData.bonnet_gasket_shop_fab} onChange={(e) => handleFieldChange("bonnet_gasket_shop_fab", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                          <span>Shop Fabricated</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 08. PRESSURE TESTING */}
                <div className="py-2.5 border-b-2 border-black text-xs">
                  <h3 className="font-black text-xs uppercase mb-2">08. PRESSURE TESTING:</h3>
                  <div className="space-y-2 text-[11px]">
                    {/* Test 1: Seat Test U/S */}
                    <div className="grid grid-cols-12 items-center gap-2 py-1 border-b border-black/20">
                      <span className="col-span-3 font-bold">Seat Test U/S</span>
                      <div className="col-span-3 flex items-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={!!formData.seat_test_us_hyd} onChange={(e) => handleFieldChange("seat_test_us_hyd", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                          <span>Hyd.</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={!!formData.seat_test_us_pneumatic} onChange={(e) => handleFieldChange("seat_test_us_pneumatic", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                          <span>Pneumatic</span>
                        </label>
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <span>Press:</span>
                        <input
                          type="text"
                          value={formData.seat_test_us_pressure || ""}
                          onChange={(e) => handleFieldChange("seat_test_us_pressure", e.target.value)}
                          disabled={isIssued}
                          placeholder="e.g. 450 PSI"
                          className="px-1 py-0.5 border border-black/60 rounded text-[11px] font-mono w-24"
                        />
                      </div>
                      <div className="col-span-3 flex items-center gap-1 justify-end">
                        <span>Result:</span>
                        <input
                          type="text"
                          value={formData.seat_test_us_result || ""}
                          onChange={(e) => handleFieldChange("seat_test_us_result", e.target.value)}
                          disabled={isIssued}
                          placeholder="Pass"
                          className="px-1 py-0.5 border border-black/60 rounded text-[11px] font-bold w-20 text-center"
                        />
                      </div>
                    </div>

                    {/* Test 2: Seat Test D/S */}
                    <div className="grid grid-cols-12 items-center gap-2 py-1 border-b border-black/20">
                      <span className="col-span-3 font-bold">Seat Test D/S</span>
                      <div className="col-span-3 flex items-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={!!formData.seat_test_ds_hyd} onChange={(e) => handleFieldChange("seat_test_ds_hyd", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                          <span>Hyd.</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={!!formData.seat_test_ds_pneumatic} onChange={(e) => handleFieldChange("seat_test_ds_pneumatic", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                          <span>Pneumatic</span>
                        </label>
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <span>Press:</span>
                        <input
                          type="text"
                          value={formData.seat_test_ds_pressure || ""}
                          onChange={(e) => handleFieldChange("seat_test_ds_pressure", e.target.value)}
                          disabled={isIssued}
                          placeholder="e.g. 450 PSI"
                          className="px-1 py-0.5 border border-black/60 rounded text-[11px] font-mono w-24"
                        />
                      </div>
                      <div className="col-span-3 flex items-center gap-1 justify-end">
                        <span>Result:</span>
                        <input
                          type="text"
                          value={formData.seat_test_ds_result || ""}
                          onChange={(e) => handleFieldChange("seat_test_ds_result", e.target.value)}
                          disabled={isIssued}
                          placeholder="Pass"
                          className="px-1 py-0.5 border border-black/60 rounded text-[11px] font-bold w-20 text-center"
                        />
                      </div>
                    </div>

                    {/* Test 3: Body Test */}
                    <div className="grid grid-cols-12 items-center gap-2 py-1">
                      <span className="col-span-3 font-bold">Body Test</span>
                      <div className="col-span-3 flex items-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={!!formData.body_test_hyd} onChange={(e) => handleFieldChange("body_test_hyd", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                          <span>Hyd.</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={!!formData.body_test_pneumatic} onChange={(e) => handleFieldChange("body_test_pneumatic", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                          <span>Pneumatic</span>
                        </label>
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <span>Press:</span>
                        <input
                          type="text"
                          value={formData.body_test_pressure || ""}
                          onChange={(e) => handleFieldChange("body_test_pressure", e.target.value)}
                          disabled={isIssued}
                          placeholder="e.g. 675 PSI"
                          className="px-1 py-0.5 border border-black/60 rounded text-[11px] font-mono w-24"
                        />
                      </div>
                      <div className="col-span-3 flex items-center gap-1 justify-end">
                        <span>Result:</span>
                        <input
                          type="text"
                          value={formData.body_test_result || ""}
                          onChange={(e) => handleFieldChange("body_test_result", e.target.value)}
                          disabled={isIssued}
                          placeholder="Pass"
                          className="px-1 py-0.5 border border-black/60 rounded text-[11px] font-bold w-20 text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 09. Ends */}
                <div className="py-2 border-b-2 border-black text-xs flex items-center gap-8">
                  <span className="font-black text-xs uppercase w-44">09. Ends</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                    <input type="checkbox" checked={!!formData.ends_distance} onChange={(e) => handleFieldChange("ends_distance", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                    <span>Distance</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                    <input type="checkbox" checked={!!formData.ends_built_up} onChange={(e) => handleFieldChange("ends_built_up", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                    <span>Built-up</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                    <input type="checkbox" checked={!!formData.ends_machined} onChange={(e) => handleFieldChange("ends_machined", e.target.checked)} disabled={isIssued} className="w-3.5 h-3.5 accent-black" />
                    <span>Machined</span>
                  </label>
                </div>

                {/* RECLAIMED BY & CHECKED BY (Two Adjacent Columns) */}
                <div className="grid grid-cols-2 border-b-2 border-black text-xs">
                  {/* Left Column: RECLAIMED BY */}
                  <div className="p-3 border-r border-black space-y-2">
                    <p className="font-bold text-[11px] uppercase">RECLAIMED BY:</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]">Name:</span>
                      <input
                        type="text"
                        value={formData.reclaimed_by_name || ""}
                        onChange={(e) => handleFieldChange("reclaimed_by_name", e.target.value)}
                        disabled={isIssued}
                        placeholder="Machinist / Technician"
                        className="px-1.5 py-0.5 border border-black/60 rounded text-[11px] flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]">P.No.:</span>
                      <input
                        type="text"
                        value={formData.reclaimed_by_pno || ""}
                        onChange={(e) => handleFieldChange("reclaimed_by_pno", e.target.value)}
                        disabled={isIssued}
                        placeholder="P-XXXX"
                        className="px-1.5 py-0.5 border border-black/60 rounded text-[11px] w-28 font-mono"
                      />
                    </div>
                    <div className="pt-2 text-[10px] text-slate-500">Sign: __________________________</div>
                  </div>

                  {/* Right Column: CHECKED BY */}
                  <div className="p-3 space-y-2">
                    <p className="font-bold text-[11px] uppercase">CHECKED BY:</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]">Name:</span>
                      <input
                        type="text"
                        value={formData.checked_by_name || ""}
                        onChange={(e) => handleFieldChange("checked_by_name", e.target.value)}
                        disabled={isIssued}
                        placeholder="Section Incharge / Lead"
                        className="px-1.5 py-0.5 border border-black/60 rounded text-[11px] flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]">P.No.:</span>
                      <input
                        type="text"
                        value={formData.checked_by_pno || ""}
                        onChange={(e) => handleFieldChange("checked_by_pno", e.target.value)}
                        disabled={isIssued}
                        placeholder="P-XXXX"
                        className="px-1.5 py-0.5 border border-black/60 rounded text-[11px] w-28 font-mono"
                      />
                    </div>
                    {formData.digital_signature ? (
                      <div className="pt-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-700">Digital Signature:</span>
                          {!isIssued && (
                            <div className="no-print flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setShowSignatureModal(true)}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[10px] rounded font-medium transition"
                              >
                                Re-sign
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleFieldChange("digital_signature", null);
                                  handleFieldChange("digital_signature_date", null);
                                  handleFieldChange("signed_by_name", null);
                                }}
                                className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-[10px] rounded font-medium transition"
                              >
                                Clear
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="bg-white border border-slate-300 rounded p-1 inline-block shadow-2xs">
                          <img
                            src={formData.digital_signature}
                            alt="Digital Signature"
                            className="h-9 w-auto max-w-[140px] object-contain"
                          />
                        </div>
                        {formData.signed_by_name && (
                          <p className="text-[9px] text-slate-500 font-mono">
                            Signed: {formData.signed_by_name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">Sign: ____________________</span>
                        {!isIssued && (
                          <button
                            type="button"
                            onClick={() => setShowSignatureModal(true)}
                            className="no-print inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-2xs transition"
                          >
                            <PenTool className="w-3 h-3" />
                            Sign
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* WITNESS from Inspection Section */}
                <div className="p-3 text-xs space-y-2">
                  <p className="font-bold text-[11px] uppercase">WITNESS from Inspection Section:</p>
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] font-semibold mt-1">Comments:</span>
                    <textarea
                      rows={2}
                      value={formData.witness_comments || ""}
                      onChange={(e) => handleFieldChange("witness_comments", e.target.value)}
                      disabled={isIssued}
                      placeholder="e.g. No leakage was observed during hydro testing. Dimensions and seat finish meet reclamation standard."
                      className="px-2 py-1 border border-black/60 rounded text-[11px] flex-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold">Sign / Inspector:</span>
                      <input
                        type="text"
                        value={formData.witness_sign || ""}
                        onChange={(e) => handleFieldChange("witness_sign", e.target.value)}
                        disabled={isIssued}
                        placeholder="Tariq Mahmood (QA)"
                        className="px-1.5 py-0.5 border border-black/60 rounded text-[11px] flex-1 font-semibold"
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[11px]">Date:</span>
                      <span className="font-mono underline underline-offset-2">{formData.certificate_date}</span>
                    </div>
                  </div>
                </div>

                {/* SPECIAL NOTE / INSTRUCTIONS (Optional Manual Text Entry) */}
                {(!isIssued || (formData.special_note && formData.special_note.trim())) && (
                  <div className="p-3 border-t border-black text-xs space-y-1.5 bg-amber-50/20">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-[11px] uppercase tracking-wide">SPECIAL NOTE / INSTRUCTIONS:</p>
                      {!isIssued && (
                        <span className="no-print text-[10px] text-slate-400 font-normal italic">
                          (Optional — omitted from certificate if blank)
                        </span>
                      )}
                    </div>
                    {!isIssued ? (
                      <>
                        <textarea
                          rows={3}
                          value={formData.special_note || ""}
                          onChange={(e) => handleFieldChange("special_note", e.target.value)}
                          placeholder="Enter any additional details, special instructions, warranty remarks, or post-reclamation observations..."
                          className="print:hidden w-full px-2 py-1.5 border border-black/60 rounded text-[11px] leading-relaxed resize-y focus:outline-none focus:border-black font-sans bg-white"
                        />
                        {formData.special_note && formData.special_note.trim() && (
                          <div className="hidden print:block text-[11px] leading-relaxed whitespace-pre-wrap font-sans text-slate-900">
                            {formData.special_note}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans text-slate-800 p-0.5">
                        {formData.special_note}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* BOTTOM FOOTER */}
              <div className="pt-2 border-t border-black text-[9px] text-slate-600 flex justify-between items-center">
                <span>Cert No: {cert.certificate_number} | Rev: {cert.revision_number} | ID: {cert.identification_no} | Status: {cert.status}</span>
                <span>FFC Fabrication Shop — Valve Reclamation System</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Canvas Modal */}
      <SignatureCanvas
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        signatoryName={formData.checked_by_name || currentUser?.full_name || "Authorized Inspector"}
        initialSignature={formData.digital_signature}
        onSave={(dataUrl) => {
          handleFieldChange("digital_signature", dataUrl);
          handleFieldChange("digital_signature_date", new Date().toISOString());
          handleFieldChange("signed_by_name", formData.checked_by_name || currentUser?.full_name || "Authorized Inspector");
          setShowSignatureModal(false);
        }}
      />

      {/* Modal: Controlled Revision */}
      {showReviseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Create Controlled Revision</h3>
            <p className="text-xs text-slate-500">
              Issuing a revision will mark Rev {cert.revision_number} as SUPERSEDED and create Rev {cert.revision_number + 1} with an immutable audit record.
            </p>
            <form onSubmit={handleRevise} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Revision <span className="text-rose-500">*</span></label>
                <textarea
                  rows={3}
                  required
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="e.g. Corrected stem bushing lapping checkbox based on final QA witness inspection."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviseModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase tracking-wider"
                >
                  Confirm Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
