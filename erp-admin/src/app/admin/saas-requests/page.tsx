"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface SaaSRequest {
  id: string;
  schoolName: string;
  principalName: string;
  email: string;
  phone: string;
  address: string;
  expectedStudents: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export default function SaaSRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SaaSRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];
      const res = await fetch("http://localhost:3001/api/v1/saas/requests", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();
      setRequests(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return;
    
    setActionLoading(id);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];
      const res = await fetch(`http://localhost:3001/api/v1/saas/${action}/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action}`);
      
      alert(data.message || `Successfully ${action}d`);
      fetchRequests();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (user?.role !== "SUPER_ADMIN") {
    return <div className="p-8 text-red-500">Access Denied: Super Admin only</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SaaS Registrations</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve incoming platform requests</p>
        </div>
        <button onClick={fetchRequests} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Refresh
        </button>
      </div>
      
      {error && <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">{error}</div>}
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                <th className="p-4 font-medium">School</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Details</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">Loading requests...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">No requests found.</td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{req.schoolName}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-gray-900">{req.principalName}</div>
                      <div className="text-sm text-gray-500">{req.email}</div>
                      <div className="text-sm text-gray-500">{req.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-700">{req.expectedStudents} expected students</div>
                      <div className="text-sm text-gray-500">{req.address}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {req.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(req.id, "approve")}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === req.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleAction(req.id, "reject")}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
