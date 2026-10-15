"use client";

import { useEffect, useState } from "react";
import { api, getStoredUser } from "@/lib/api";
import {
  Users2,
  Plus,
  ShieldCheck,
  UserCheck,
  Mail,
  ShieldAlert,
  X,
  Phone,
  CheckCircle2,
  Clock,
  Ban,
  Filter,
  Check,
  RotateCcw,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Approval Modal state
  const [approvalUser, setApprovalUser] = useState<any | null>(null);
  const [assignedRole, setAssignedRole] = useState("technician");

  // Create Form
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState("technician");
  const [pNumber, setPNumber] = useState("");
  const [password, setPassword] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUser(getStoredUser());
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        username,
        email,
        full_name: fullName,
        phone_number: phoneNumber || undefined,
        role,
        p_number: pNumber,
        password,
      });
      setShowModal(false);
      setUsername("");
      setEmail("");
      setFullName("");
      setPhoneNumber("");
      setPassword("");
      setPNumber("");
      fetchUsers();
    } catch (err: any) {
      alert("Error creating user: " + err.message);
    }
  };

  const handleUpdateStatus = async (
    userId: number,
    newStatus: string,
    newRole?: string
  ) => {
    setActionLoadingId(userId);
    try {
      await api.updateUserStatus(userId, {
        account_status: newStatus,
        role_name: newRole,
        is_active: newStatus === "ACTIVE",
      });
      await fetchUsers();
      setApprovalUser(null);
    } catch (err: any) {
      alert("Error updating user status: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const isAdmin = currentUser?.role === "admin";

  const pendingCount = users.filter(
    (u) => u.account_status === "PENDING_APPROVAL"
  ).length;

  const filteredUsers = users.filter((u) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "PENDING")
      return u.account_status === "PENDING_APPROVAL";
    if (statusFilter === "ACTIVE")
      return u.account_status === "ACTIVE" || !u.account_status;
    if (statusFilter === "SUSPENDED")
      return u.account_status === "SUSPENDED" || u.account_status === "REJECTED";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Personnel & Access Control"
        description="FFC employee accounts, contact details, role authorizations, and pending security clearances."
        badge={
          <span className="px-2.5 py-0.5 text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-full flex items-center gap-1.5">
            <Users2 className="w-3.5 h-3.5 text-slate-500" />
            {users.length} Personnel Accounts
          </span>
        }
        actions={
          isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Enroll Staff Member
            </button>
          )
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            statusFilter === "ALL"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Accounts ({users.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("PENDING")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
            statusFilter === "PENDING"
              ? "bg-amber-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Pending Approval
          {pendingCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === "PENDING"
                  ? "bg-white text-amber-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("ACTIVE")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            statusFilter === "ACTIVE"
              ? "bg-emerald-700 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Active Staff
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("SUSPENDED")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            statusFilter === "SUSPENDED"
              ? "bg-rose-700 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Suspended / Inactive
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-4 font-semibold">Full Name</th>
                <th className="py-2.5 px-3 font-semibold">Username</th>
                <th className="py-2.5 px-3 font-semibold">P. Number</th>
                <th className="py-2.5 px-3 font-semibold">Mobile Phone</th>
                <th className="py-2.5 px-3 font-semibold">Role</th>
                <th className="py-2.5 px-3 text-center font-semibold">Status</th>
                {isAdmin && (
                  <th className="py-2.5 px-4 text-right font-semibold">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="py-12 text-center text-slate-400 font-mono text-xs"
                  >
                    Loading personnel accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="py-12 text-center text-slate-400 text-xs"
                  >
                    No personnel accounts match the current filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isPending = u.account_status === "PENDING_APPROVAL";
                  const isSuspended =
                    u.account_status === "SUSPENDED" ||
                    u.account_status === "REJECTED";
                  const isCurrent = currentUser?.id === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{u.full_name}</span>
                          {isCurrent && (
                            <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded border">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal block">
                          {u.email}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        @{u.username}
                      </td>

                      <td className="py-2.5 px-3 font-mono font-medium text-emerald-800">
                        {u.p_number || "—"}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {u.phone_number ? (
                          <div className="flex items-center gap-1">
                            <span>{u.phone_number}</span>
                            {u.is_phone_verified && (
                              <span title="Verified phone">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase ${
                            u.role === "admin"
                              ? "bg-purple-50 text-purple-800 border border-purple-200"
                              : u.role === "inspector"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : u.role === "technician"
                              ? "bg-sky-50 text-sky-800 border border-sky-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border uppercase ${
                            isPending
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : isSuspended
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {u.account_status || (u.is_active ? "ACTIVE" : "INACTIVE")}
                        </span>
                      </td>

                      {isAdmin && (
                        <td className="py-2.5 px-4 text-right">
                          {isCurrent ? (
                            <span className="text-[10px] text-slate-400 italic">
                              Self
                            </span>
                          ) : isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={actionLoadingId === u.id}
                                onClick={() => {
                                  setApprovalUser(u);
                                  setAssignedRole(u.role || "technician");
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1 shadow-2xs"
                              >
                                <Check className="w-3 h-3" />
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={actionLoadingId === u.id}
                                onClick={() =>
                                  handleUpdateStatus(u.id, "REJECTED")
                                }
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-medium transition-colors border border-rose-200"
                              >
                                Reject
                              </button>
                            </div>
                          ) : isSuspended ? (
                            <button
                              type="button"
                              disabled={actionLoadingId === u.id}
                              onClick={() =>
                                handleUpdateStatus(u.id, "ACTIVE")
                              }
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-medium transition-colors border border-slate-200 flex items-center gap-1 ml-auto"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={actionLoadingId === u.id}
                              onClick={() =>
                                handleUpdateStatus(u.id, "SUSPENDED")
                              }
                              className="px-2 py-1 hover:bg-rose-50 text-rose-600 rounded text-[11px] font-medium transition-colors border border-transparent hover:border-rose-200 flex items-center gap-1 ml-auto"
                            >
                              <Ban className="w-3 h-3" />
                              Suspend
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval & Role Assignment Modal */}
      {approvalUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Approve Personnel Access
              </h3>
              <button
                onClick={() => setApprovalUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-600 bg-slate-50 p-3 rounded border border-slate-200">
              <div>
                <span className="font-semibold text-slate-800">Staff Name: </span>
                {approvalUser.full_name}
              </div>
              <div>
                <span className="font-semibold text-slate-800">Email: </span>
                {approvalUser.email}
              </div>
              <div>
                <span className="font-semibold text-slate-800">Mobile Phone: </span>
                <span className="font-mono">{approvalUser.phone_number || "Not provided"}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block text-slate-700 font-semibold">
                Assign System Authorization Role *
              </label>
              <select
                value={assignedRole}
                onChange={(e) => setAssignedRole(e.target.value)}
                className="w-full px-2.5 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
              >
                <option value="technician">Technician / Reclamation Staff</option>
                <option value="fab_shop">FAB Shop / Registration Staff</option>
                <option value="inspector">Quality Inspector / Certificate Signatory</option>
                <option value="viewer">Management / Viewer</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setApprovalUser(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateStatus(approvalUser.id, "ACTIVE", assignedRole)
                }
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium shadow-2xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm Clearance & Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual User Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Enroll Authorized Staff Account
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Muhammad Akram"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. makram"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    P. Number (P.No.)
                  </label>
                  <input
                    type="text"
                    value={pNumber}
                    onChange={(e) => setPNumber(e.target.value)}
                    placeholder="e.g. P-2055"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. akram@ffc.com.pk"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Mobile Phone (E.164)
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+923001234567"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Assigned Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="fab_shop">FAB Shop / Registration Staff</option>
                  <option value="technician">Technician / Reclamation Staff</option>
                  <option value="inspector">
                    Quality Inspector / Certificate Approver
                  </option>
                  <option value="viewer">Management / Viewer</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Strong initial password"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
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
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
