"use client";

import { useState } from "react";
import { useAssets, useAssetCategories, useVendors, apiCall, invalidate } from "@/lib/api-hooks";
import { PageHeader, DataTable, StatusBadge } from "@/components/DashboardLayout";

export default function AssetsPage() {
  const { data: assets, error, isLoading } = useAssets();
  const { data: categories } = useAssetCategories();
  const { data: vendors } = useVendors();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", categoryId: "", vendorId: "", serialNumber: "", purchaseCost: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall("/api/v1/assets", "POST", { ...formData, purchaseCost: Number(formData.purchaseCost) || 0 });
      invalidate("/api/v1/assets");
      setShowModal(false);
      setFormData({ name: "", categoryId: "", vendorId: "", serialNumber: "", purchaseCost: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create asset");
    }
  };

  if (isLoading) return <div className="text-text-secondary text-sm">Loading assets...</div>;
  if (error) return <div className="text-danger text-sm">Failed to load assets: {error.message}</div>;

  const rows = assets?.map((a: any) => [
    <strong key="name">{a.name}</strong>,
    a.category?.name || "N/A",
    a.serialNumber || "-",
    `₹${a.purchaseCost || 0}`,
    a.vendor?.name || "N/A",
    <StatusBadge key="status" status="ACTIVE" color="#10B981" />
  ]) || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Asset Management" 
        subtitle="Track inventory, hardware, and school properties." 
        action={
          <button onClick={() => setShowModal(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition">
            + New Asset
          </button>
        }
      />

      <DataTable 
        headers={["Asset Name", "Category", "Serial No", "Cost", "Vendor", "Status"]}
        rows={rows}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add New Asset</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Asset Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Category</label>
                <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full border rounded-lg p-2 text-sm">
                  <option value="">Select Category</option>
                  {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Vendor</label>
                <select value={formData.vendorId} onChange={e => setFormData({...formData, vendorId: e.target.value})} className="w-full border rounded-lg p-2 text-sm">
                  <option value="">Select Vendor (Optional)</option>
                  {vendors?.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Serial Number</label>
                <input type="text" value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Purchase Cost (₹)</label>
                <input type="number" value={formData.purchaseCost} onChange={e => setFormData({...formData, purchaseCost: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90">Save Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
