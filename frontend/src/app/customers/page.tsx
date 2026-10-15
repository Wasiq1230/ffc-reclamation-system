"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Building2, Plus, Edit2, Phone, Mail, MapPin, User, CheckCircle2, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function ExternalCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCust, setEditCust] = useState<any>(null);

  // Form State
  const [name, setName] = useState("");
  const [facility, setFacility] = useState("");
  const [area, setArea] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [refNo, setRefNo] = useState("");

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getExternalCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openCreateModal = () => {
    setEditCust(null);
    setName("");
    setFacility("");
    setArea("");
    setContact("");
    setPhone("");
    setEmail("");
    setAddress("");
    setRefNo("");
    setShowModal(true);
  };

  const openEditModal = (c: any) => {
    setEditCust(c);
    setName(c.customer_name);
    setFacility(c.plant_facility_name || "");
    setArea(c.department_operating_area || "");
    setContact(c.contact_person || "");
    setPhone(c.phone || "");
    setEmail(c.email || "");
    setAddress(c.address || "");
    setRefNo(c.reference_number || "");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        customer_name: name,
        plant_facility_name: facility,
        department_operating_area: area,
        contact_person: contact,
        phone,
        email,
        address,
        reference_number: refNo,
      };

      if (editCust) {
        await api.updateExternalCustomer(editCust.id, payload);
      } else {
        await api.createExternalCustomer(payload);
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err: any) {
      alert("Error saving customer: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="External Clients & Commercial Partners"
        description="Outside industrial plants and commercial organizations receiving valve reclamation services."
        badge={
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded">
            {customers.length} Clients
          </span>
        }
        actions={
          <button
            onClick={openCreateModal}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add External Client
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div key={c.id} className="p-4 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{c.customer_name}</h3>
                  <span className="text-[11px] text-emerald-800 font-medium">{c.plant_facility_name || "Industrial Facility"}</span>
                </div>
                <button
                  onClick={() => openEditModal(c)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {c.department_operating_area && (
                <p className="text-xs text-slate-500 mt-1">Area: {c.department_operating_area}</p>
              )}

              <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
                {c.contact_person && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.contact_person}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.address && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-mono">{c.reference_number || "REF-EXT"}</span>
              <span className="text-emerald-700 font-mono font-semibold">Active Account</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                {editCust ? "Edit External Customer" : "Register External Customer"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company / Customer Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fatima Fertilizer Sadiqabad"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Plant / Facility Name</label>
                <input
                  type="text"
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  placeholder="e.g. Ammonia II Complex"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Operating Department / Area</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Synthesis Loop Section"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="e.g. Engr. Asif"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 0000000"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-2xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
