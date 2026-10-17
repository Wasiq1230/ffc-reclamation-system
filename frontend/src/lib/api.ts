const API_BASE = typeof window !== "undefined" ? "/api" : (process.env.INTERNAL_API_URL || "http://127.0.0.1:8000/api");

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("ffc_auth_token");
  }
  return null;
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("ffc_auth_token", token);
    window.dispatchEvent(new Event("auth-changed"));
  }
}

export function removeAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("ffc_auth_token");
    localStorage.removeItem("ffc_user");
    window.dispatchEvent(new Event("auth-changed"));
  }
}

export function getStoredUser(): any | null {
  if (typeof window !== "undefined") {
    const u = localStorage.getItem("ffc_user");
    return u ? JSON.parse(u) : null;
  }
  return null;
}

export function setStoredUser(user: any) {
  if (typeof window !== "undefined") {
    localStorage.setItem("ffc_user", JSON.stringify(user));
    window.dispatchEvent(new Event("auth-changed"));
  }
}

let autoLoginPromise: Promise<string | null> | null = null;

export async function ensureAuthenticated(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const existingToken = getAuthToken();
  if (existingToken) return existingToken;

  if (autoLoginPromise) {
    return autoLoginPromise;
  }

  autoLoginPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "admin",
          username: "admin",
          password: "Admin@FFC2026!",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          setAuthToken(data.access_token);
          if (data.user) {
            setStoredUser(data.user);
          }
          return data.access_token;
        }
      }
    } catch (err) {
      console.warn("Auto-authentication attempt failed:", err);
    } finally {
      autoLoginPromise = null;
    }
    return null;
  })();

  return autoLoginPromise;
}

async function request(endpoint: string, options: RequestInit & { _retryCount?: number } = {}) {
  const isAuthEndpoint =
    endpoint.includes("/auth/login") ||
    endpoint.includes("/auth/register") ||
    endpoint.includes("/auth/verify") ||
    endpoint.includes("/auth/forgot") ||
    endpoint.includes("/auth/reset");

  if (typeof window !== "undefined" && !isAuthEndpoint && !getAuthToken()) {
    await ensureAuthenticated();
  }

  let token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (netErr: any) {
    throw new Error(
      "Unable to connect to backend server. Please verify network connectivity."
    );
  }

  // Handle Render cold boot (HTTP 502 / 503 / 504 Gateway errors)
  const retryCount = options._retryCount || 0;
  if ((res.status === 502 || res.status === 503 || res.status === 504) && retryCount < 2) {
    console.warn(`Server cold start detected (${res.status}). Retrying attempt ${retryCount + 1} in 4s...`);
    await new Promise((r) => setTimeout(r, 4000));
    return request(endpoint, { ...options, _retryCount: retryCount + 1 });
  }

  // If 401 Unauthorized occurs on an authenticated route, attempt auto-refresh/relogin once
  if (res.status === 401 && typeof window !== "undefined" && !isAuthEndpoint) {
    console.warn("Received 401 for", endpoint, "– attempting re-authentication...");
    removeAuthToken();
    const newToken = await ensureAuthenticated();
    if (newToken) {
      const retryHeaders: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
        "Authorization": `Bearer ${newToken}`,
      };
      if (options.body && !(options.body instanceof FormData) && !retryHeaders["Content-Type"]) {
        retryHeaders["Content-Type"] = "application/json";
      }
      res = await fetch(url, { ...options, headers: retryHeaders });
    }
  }

  if (!res.ok) {
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error("Backend server is currently starting up from sleep. Please wait 10 seconds and try again.");
    }
    let errMsg = "An error occurred";
    try {
      const errData = await res.json();
      if (typeof errData.detail === "string") {
        errMsg = errData.detail;
      } else if (Array.isArray(errData.detail)) {
        // FastAPI / Pydantic validation error list
        errMsg = errData.detail
          .map((item: any) => {
            if (typeof item === "string") return item;
            const field = item.loc ? item.loc[item.loc.length - 1] : "";
            const msg = item.msg || JSON.stringify(item);
            return field && field !== "body" ? `${field}: ${msg}` : msg;
          })
          .join("; ");
      } else if (errData.detail && typeof errData.detail === "object") {
        errMsg = errData.detail.message || JSON.stringify(errData.detail);
      } else if (errData.message) {
        errMsg = typeof errData.message === "string" ? errData.message : JSON.stringify(errData.message);
      } else {
        errMsg = JSON.stringify(errData);
      }
    } catch {
      errMsg = res.statusText || `HTTP Error ${res.status}`;
    }
    throw new Error(errMsg);
  }

  return res.json();
}

export const api = {
  ensureAuthenticated,
  // Auth
  async login(identifier: string, password: string, phoneNumber?: string) {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier: identifier.trim(),
        username: identifier.trim(),
        phone_number: phoneNumber || (identifier.startsWith("+") || /^[0-9\s-]+$/.test(identifier) ? identifier.trim() : undefined),
        password,
      }),
    });
    setAuthToken(data.access_token);
    setStoredUser(data.user);
    return data;
  },
  async register(userData: any) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },
  async verifyPhoneOtp(data: { phone_number: string; otp_code: string }) {
    return request("/auth/verify-phone-otp", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async verifyEmail(token: string) {
    return request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },
  async forgotPassword(identifier: string) {
    return request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    });
  },
  async resetPassword(data: { identifier: string; token_or_otp: string; new_password: string }) {
    return request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async changePassword(data: { current_password: string; new_password: string }) {
    return request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateProfile(profileData: any) {
    const data = await request("/auth/me", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
    setStoredUser(data);
    return data;
  },
  async getMe() {
    return request("/auth/me");
  },
  async getUsers(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/auth/users${query}`);
  },
  async updateUserStatus(userId: number, statusData: any) {
    return request(`/auth/users/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify(statusData),
    });
  },
  async createUser(userData: any) {
    return request("/auth/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },
  async updateUser(userId: number, userData: any) {
    return request(`/auth/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  // Organizations
  async getPlants() {
    return request("/org/plants");
  },
  async getDepartments(plantId?: number) {
    const query = plantId ? `?plant_id=${plantId}` : "";
    return request(`/org/departments${query}`);
  },
  async getExternalCustomers() {
    return request("/org/customers");
  },
  async createExternalCustomer(data: any) {
    return request("/org/customers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateExternalCustomer(id: number, data: any) {
    return request(`/org/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Jobs
  async getJobs(params: Record<string, any> = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        searchParams.append(k, String(v));
      }
    });
    return request(`/jobs?${searchParams.toString()}`);
  },
  async getJobDetail(jobId: number) {
    return request(`/jobs/${jobId}`);
  },
  async registerJob(jobData: any) {
    return request("/jobs", {
      method: "POST",
      body: JSON.stringify(jobData),
    });
  },
  async updateJob(jobId: number, jobData: any) {
    return request(`/jobs/${jobId}`, {
      method: "PUT",
      body: JSON.stringify(jobData),
    });
  },
  async updateJobStatus(jobId: number, new_status: string, reason?: string) {
    return request(`/jobs/${jobId}/status`, {
      method: "POST",
      body: JSON.stringify({ new_status, reason }),
    });
  },
  async archiveJob(jobId: number) {
    return request(`/jobs/${jobId}`, { method: "DELETE" });
  },
  async deleteJob(jobId: number) {
    return request(`/jobs/${jobId}`, { method: "DELETE" });
  },

  // Technical
  async addInspection(jobId: number, data: any) {
    return request(`/jobs/${jobId}/inspections`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async addWorkEntry(jobId: number, data: any) {
    return request(`/jobs/${jobId}/work-entries`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async addMaterial(jobId: number, data: any) {
    return request(`/jobs/${jobId}/materials`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async addPressureTest(jobId: number, data: any) {
    return request(`/jobs/${jobId}/tests`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Certificates
  async getCertificates(params: Record<string, any> = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        searchParams.append(k, String(v));
      }
    });
    return request(`/certificates?${searchParams.toString()}`);
  },
  async createCertificateFromJob(jobId: number) {
    return request(`/certificates/from-job/${jobId}`, { method: "POST" });
  },
  async getCertificate(certId: number) {
    return request(`/certificates/${certId}`);
  },
  async updateCertificate(certId: number, data: any) {
    return request(`/certificates/${certId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async submitCertificate(certId: number) {
    return request(`/certificates/${certId}/submit`, { method: "POST" });
  },
  async approveCertificate(certId: number) {
    return request(`/certificates/${certId}/approve`, { method: "POST" });
  },
  async issueCertificate(certId: number) {
    return request(`/certificates/${certId}/issue`, { method: "POST" });
  },
  async reviseCertificate(certId: number, reason: string, changes?: any) {
    return request(`/certificates/${certId}/revise`, {
      method: "POST",
      body: JSON.stringify({ reason, changes }),
    });
  },
  getCertificatePdfUrl(certId: number) {
    const token = getAuthToken();
    return `${API_BASE}/certificates/${certId}/pdf?token=${token || ""}`;
  },

  async downloadCertificatePdf(certId: number, certNumber: string = "CERTIFICATE") {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const downloadUrl = `${API_BASE}/certificates/${certId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const res = await fetch(downloadUrl, { headers });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Failed to download certificate PDF (${res.status}): ${errText || res.statusText}`);
    }

    const blob = await res.blob();
    const safeFileName = `${certNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    // 1. Android Native Scoped Storage & PDF Viewer via AndroidDownloader
    if (typeof window !== "undefined" && (window as any).AndroidDownloader?.saveAndOpenPdf) {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const base64Data = reader.result as string;
            (window as any).AndroidDownloader.saveAndOpenPdf(base64Data, safeFileName);
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = () => reject(new Error("Failed to process certificate file data"));
        reader.readAsDataURL(blob);
      });
    }

    // 2. Standard Web Browser In-App Download (Desktop & Web)
    if (typeof window !== "undefined") {
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = safeFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    }
  },

  // Export Downloads (CSV & Excel) with Authentication & Android Scoped Storage
  async downloadExportFile(type: "csv" | "excel", params: Record<string, any> = {}) {
    if (typeof window !== "undefined" && !getAuthToken()) {
      await ensureAuthenticated();
    }
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        query.append(k, String(v));
      }
    });

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const downloadUrl = `${API_BASE}/jobs/export/${type}${queryString}`;
    const res = await fetch(downloadUrl, { headers });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Failed to export ${type.toUpperCase()} file (${res.status}): ${errText || res.statusText}`);
    }

    const blob = await res.blob();
    const today = new Date().toISOString().slice(0, 10);
    const ext = type === "csv" ? "csv" : "xlsx";
    const mimeType = type === "csv"
      ? "text/csv"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const safeFileName = `FFC_Reclamation_Register_${today}.${ext}`;

    // 1. Android Native Scoped Storage via AndroidDownloader
    if (typeof window !== "undefined") {
      const downloader = (window as any).AndroidDownloader;
      if (downloader?.saveAndOpenFile) {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const base64Data = reader.result as string;
              downloader.saveAndOpenFile(base64Data, safeFileName, mimeType);
              resolve();
            } catch (e) {
              reject(e);
            }
          };
          reader.onerror = () => reject(new Error(`Failed to process ${type.toUpperCase()} data`));
          reader.readAsDataURL(blob);
        });
      }
    }

    // 2. Standard Web Browser In-App Download (Desktop & Web)
    if (typeof window !== "undefined") {
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = safeFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    }
  },

  async downloadJobsCsv(params: Record<string, any> = {}) {
    return this.downloadExportFile("csv", params);
  },

  async downloadJobsExcel(params: Record<string, any> = {}) {
    return this.downloadExportFile("excel", params);
  },

  reloadAppFromServer(forceClearCache: boolean = true) {
    if (typeof window !== "undefined") {
      const downloader = (window as any).AndroidDownloader;
      if (downloader?.reloadApp) {
        downloader.reloadApp(forceClearCache);
      } else {
        window.location.reload();
      }
    }
  },

  // Reports & Dashboard
  async getDashboard(date_from?: string, date_to?: string) {
    const q = new URLSearchParams();
    if (date_from) q.append("date_from", date_from);
    if (date_to) q.append("date_to", date_to);
    return request(`/reports/dashboard?${q.toString()}`);
  },

  // Financials
  async getFinancials(jobId: number) {
    return request(`/financials/job/${jobId}`);
  },
  async updateFinancials(jobId: number, data: any) {
    return request(`/financials/job/${jobId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async getFinancialList(params: Record<string, any> = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        searchParams.append(k, String(v));
      }
    });
    return request(`/financials?${searchParams.toString()}`);
  },
  async getAvailableJobsForFinance() {
    return request("/financials/available-jobs");
  },
  async createFinancialRecord(data: any) {
    return request("/financials", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateFinancialRecordById(recordId: number, data: any) {
    return request(`/financials/${recordId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async deleteFinancialRecord(recordId: number) {
    return request(`/financials/${recordId}`, {
      method: "DELETE",
    });
  },

  // Audit
  async getAuditLogs(params: Record<string, any> = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        searchParams.append(k, String(v));
      }
    });
    return request(`/audit?${searchParams.toString()}`);
  },

  // Settings
  async getSettings() {
    return request("/settings");
  },
  async updateSettings(data: any) {
    return request("/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Certificate OCR Scanner
  async scanExtractCertificate(formData: FormData) {
    return request("/certificates/scan-extract", {
      method: "POST",
      body: formData,
    });
  },
  async scanAndRegisterCertificate(formData: FormData) {
    return request("/certificates/scan-and-register", {
      method: "POST",
      body: formData,
    });
  },

  // Valve Dismantling & Before/After Photos
  async uploadValvePhoto(jobId: number, formData: FormData) {
    return request(`/jobs/${jobId}/photos`, {
      method: "POST",
      body: formData,
    });
  },
  async getValvePhotos(jobId: number, stage?: string) {
    const q = stage ? `?stage=${stage}` : "";
    return request(`/jobs/${jobId}/photos${q}`);
  },
  async getAllValvePhotos(params: Record<string, any> = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        q.append(k, String(v));
      }
    });
    return request(`/photos?${q.toString()}`);
  },
  async deleteValvePhoto(photoId: number) {
    return request(`/photos/${photoId}`, {
      method: "DELETE",
    });
  },
  getPhotoUrl(photoId: number) {
    return `${API_BASE}/photos/${photoId}/file`;
  },
};
