"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, StatusBadge } from "@/components/DashboardLayout";
import { useGallery, apiCall, invalidateAll } from "@/lib/api-hooks";

const categoryColors: Record<string, string> = {
  Campus: "#FF6B00", Facilities: "#3B82F6", Events: "#8B5CF6", Academic: "#10B981", Sports: "#F59E0B", Pillars: "#EC4899", Sishuvatika: "#14B8A6", "NCC/Scout/Guide": "#6366F1"
};

export default function GalleryPage() {
  const [showModal, setShowModal] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Campus");
  const [formStudentClass, setFormStudentClass] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filter, setFilter] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: raw, isLoading } = useGallery(filter !== "all" ? filter : undefined);
  const images = Array.isArray(raw) ? raw : raw?.data || raw || [];


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { alert("Please select an image"); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("title", formTitle);
      formData.append("category", formCategory);

      let finalDescription = formDesc;
      if (formCategory === "Achievements" && formStudentClass.trim() !== "") {
        finalDescription = `Class: ${formStudentClass.trim()}\n\n${formDesc}`;
      }
      formData.append("description", finalDescription);

      await apiCall("/api/gallery", "POST", formData);
      invalidateAll("/api/gallery");
      setShowModal(false);
      setFormTitle(""); setFormStudentClass(""); setFormDesc(""); setFile(null);
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try { 
      await apiCall(`/api/gallery/${id}`, "DELETE"); 
      invalidateAll("/api/gallery"); 
    }
    catch (err) { alert((err as Error).message); }
    finally { 
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Gallery Management"
        subtitle="Upload and manage school photos"
        action={
          <button onClick={() => { 
            setIsLocked(false); 
            setFormTitle(""); 
            setFormCategory("Campus"); 
            setFormStudentClass("");
            setFormDesc(""); 
            setFile(null); 
            setShowModal(true); 
          }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)]">
            + Upload Photo
          </button>
        }
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "Hero", "Campus", "Facilities", "Events", "Academic", "Sports", "Pillars", "Achievements", "Sishuvatika", "NCC/Scout/Guide"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold border cursor-pointer font-[var(--font-heading)] transition-all
              ${filter === f ? "bg-primary text-white border-primary" : "bg-white text-text-secondary border-border hover:border-primary"}`}>
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {filter === "Pillars" && (
        <div className="mb-8 bg-slate-50 p-6 rounded-2xl border border-border">
          <h3 className="text-[16px] font-bold font-[var(--font-heading)] mb-4 text-text-primary">Core Leadership (Pillars)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {["Pradhan Acharya", "President", "Secretary", "Vice President", "Joint Secretary", "Treasurer", "Academic Director", "Sports Director", "Cultural Head"].map((role) => {
              const existingImg = images.find((img: Record<string, unknown>) => img.title === role);
              return (
                <div key={role} className="bg-white rounded-xl border border-border p-5 flex flex-col items-center text-center">
                  <h4 className="font-semibold text-text-primary mb-4 font-[var(--font-heading)]">{role}</h4>
                  {existingImg ? (
                    <div className="relative w-32 h-32 mb-4 group">
                      <img src={existingImg.imageUrl as string} alt={role} className="w-full h-full object-cover rounded-full shadow-md border-4 border-white" />
                      <button 
                        onClick={() => setConfirmDeleteId(existingImg.id as string)} 
                        className="absolute -top-2 -right-2 bg-danger text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 mb-4 bg-gray-50 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <span className="text-gray-400 text-4xl">👤</span>
                    </div>
                  )}
                  
                  {existingImg && confirmDeleteId === existingImg.id && (
                    <div className="flex flex-col items-center gap-2 mb-2 bg-red-50 p-2 rounded-lg border border-red-100">
                      <span className="text-[11px] text-danger font-medium">Delete this image?</span>
                      <div className="flex gap-3">
                        <button onClick={() => handleDelete(existingImg.id as string)} disabled={deletingId === existingImg.id} className="text-[12px] text-white bg-danger px-3 py-1 rounded-md font-semibold hover:bg-red-600 disabled:opacity-50">Yes</button>
                        <button onClick={() => setConfirmDeleteId(null)} disabled={deletingId === existingImg.id} className="text-[12px] text-text-secondary px-3 py-1 rounded-md font-semibold hover:bg-gray-200 disabled:opacity-50">No</button>
                      </div>
                    </div>
                  )}

                  {!existingImg && (
                    <button 
                      onClick={() => {
                        setFormTitle(role);
                        setFormCategory("Pillars");
                        setFormDesc("");
                        setFile(null);
                        setIsLocked(true);
                        setShowModal(true);
                      }} 
                      className="px-5 py-2.5 bg-primary/10 text-primary font-semibold rounded-xl text-[13px] hover:bg-primary/20 transition-colors font-[var(--font-heading)]">
                      Upload Image
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
        </div>
      ) : images.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <p className="text-text-secondary">No images found. Upload your first photo!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {images.filter((img: Record<string, unknown>) => filter !== "Pillars" || !["Pradhan Acharya", "President", "Secretary", "Vice President", "Joint Secretary", "Treasurer", "Academic Director", "Sports Director", "Cultural Head"].includes(img.title as string)).map((img: Record<string, unknown>, i: number) => (
            <motion.div key={img.id as string} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-border overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="aspect-[4/3] bg-surface relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={img.imageUrl as string} 
                  alt={img.title as string}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.currentTarget as HTMLImageElement;
                    target.onerror = null; // Prevent infinite loop if fallback also fails
                    target.src = `https://via.placeholder.com/800x600/FF6B00/FFFFFF?text=${encodeURIComponent(img.title as string)}`;
                  }}
                />
                <div className="absolute top-2 right-2">
                  <StatusBadge status={img.category as string} color={categoryColors[img.category as string] || "#6B7280"} />
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-[14px] font-semibold text-text-primary font-[var(--font-heading)] mb-1">{img.title as string}</h4>
                {img.description ? <p className="text-[12px] text-text-secondary mb-3 line-clamp-2">{img.description as string}</p> : null}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[11px] text-text-secondary">
                    {new Date(img.createdAt as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {confirmDeleteId === img.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-text-secondary font-medium">Are you sure?</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(img.id as string);
                        }} 
                        disabled={deletingId === img.id}
                        className="text-[12px] text-danger font-semibold bg-transparent border-none cursor-pointer hover:underline disabled:opacity-50">
                        {deletingId === img.id ? "..." : "Yes"}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }} 
                        disabled={deletingId === img.id}
                        className="text-[12px] text-text-secondary font-semibold bg-transparent border-none cursor-pointer hover:underline disabled:opacity-50">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(img.id as string);
                      }}
                      className="text-[12px] text-danger font-semibold bg-transparent border-none cursor-pointer font-[var(--font-heading)] hover:underline">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/40 z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90%] max-w-[520px] bg-white rounded-2xl p-8 z-[101] shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[20px] font-bold font-[var(--font-heading)]">Upload Photo</h3>
                <button onClick={() => setShowModal(false)} className="text-[20px] text-text-secondary bg-transparent border-none cursor-pointer">✕</button>
              </div>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-[12px] font-semibold text-text-primary mb-1 font-[var(--font-heading)]">Title</label>
                  <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Photo title" required disabled={isLocked}
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary disabled:bg-gray-100 disabled:text-gray-500" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-text-primary mb-1 font-[var(--font-heading)]">Category</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} disabled={isLocked}
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary bg-white disabled:bg-gray-100 disabled:text-gray-500">
                    <option>Hero</option><option>Campus</option><option>Facilities</option><option>Events</option><option>Academic</option><option>Sports</option><option>Pillars</option><option>Achievements</option><option>Sishuvatika</option><option>NCC/Scout/Guide</option>
                  </select>
                </div>
                {formCategory === "Achievements" && (
                  <div>
                    <label className="block text-[12px] font-semibold text-text-primary mb-1 font-[var(--font-heading)]">Student's Class</label>
                    <input type="text" value={formStudentClass} onChange={(e) => setFormStudentClass(e.target.value)} placeholder="e.g. Class X" required disabled={isLocked}
                      className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary disabled:bg-gray-100 disabled:text-gray-500" />
                  </div>
                )}
                <div>
                  <label className="block text-[12px] font-semibold text-text-primary mb-1 font-[var(--font-heading)]">Image File</label>
                  <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-text-primary mb-1 font-[var(--font-heading)]">Description</label>
                  <textarea rows={2} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Optional description..."
                    className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary resize-none" />
                </div>
                <button type="submit" disabled={saving}
                  className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)] disabled:opacity-50">
                  {saving ? "Uploading..." : "Upload Photo"}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
