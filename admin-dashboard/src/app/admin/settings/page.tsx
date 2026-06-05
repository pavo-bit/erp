"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader } from "@/components/DashboardLayout";
import { useSiteContent, useTestimonials, apiCall, invalidateAll } from "@/lib/api-hooks";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [tName, setTName] = useState("");
  const [tRole, setTRole] = useState("");
  const [tContent, setTContent] = useState("");
  const tRating = "5";

  const { data: cmsRaw } = useSiteContent();
  const cms = cmsRaw || {};
  const { data: testRaw } = useTestimonials();
  const testimonials = Array.isArray(testRaw) ? testRaw : testRaw?.data || testRaw || [];

  // Editable CMS fields
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutDesc, setAboutDesc] = useState("");
  const [ctaTitle, setCtaTitle] = useState("");
  const [ctaDesc, setCtaDesc] = useState("");
  const [inited, setInited] = useState(false);

  if (cms?.hero && !inited) {
    setHeroTitle(cms.hero?.title || ""); setHeroSubtitle(cms.hero?.subtitle || "");
    setAboutTitle(cms.about?.title || ""); setAboutDesc(cms.about?.description || "");
    setCtaTitle(cms.admission?.ctaTitle || ""); setCtaDesc(cms.admission?.ctaDescription || "");
    setInited(true);
  }

  const saveCMS = async () => {
    setSaving(true);
    try {
      await apiCall("/api/site-content", "PUT", { updates: [
        { section: "hero", key: "title", value: heroTitle },
        { section: "hero", key: "subtitle", value: heroSubtitle },
        { section: "about", key: "title", value: aboutTitle },
        { section: "about", key: "description", value: aboutDesc },
        { section: "admission", key: "ctaTitle", value: ctaTitle },
        { section: "admission", key: "ctaDescription", value: ctaDesc },
      ]});
      invalidateAll("/api/site-content");
      alert("Settings saved!");
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  const addTestimonial = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await apiCall("/api/testimonials", "POST", { name: tName, role: tRole, content: tContent, rating: +tRating });
      invalidateAll("/api/testimonials"); setShowTestimonialModal(false);
      setTName(""); setTRole(""); setTContent("");
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  };

  const inputCls = "w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary";
  const labelCls = "block text-[12px] font-semibold text-text-primary mb-1 font-[var(--font-heading)]";

  return (
    <>
      <PageHeader title="Site Settings" subtitle="Manage website content, testimonials and CMS" />

      {/* CMS Content */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h3 className="text-[16px] font-semibold font-[var(--font-heading)] mb-5">🏠 Homepage Content (CMS)</h3>
        <div className="flex flex-col gap-4">
          <div><label className={labelCls}>Hero Title</label><input type="text" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Hero Subtitle</label><textarea rows={2} value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} className={`${inputCls} resize-none`} /></div>
          <div><label className={labelCls}>About Title</label><input type="text" value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>About Description</label><textarea rows={3} value={aboutDesc} onChange={(e) => setAboutDesc(e.target.value)} className={`${inputCls} resize-none`} /></div>
          <div><label className={labelCls}>Admission CTA Title</label><input type="text" value={ctaTitle} onChange={(e) => setCtaTitle(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Admission CTA Description</label><textarea rows={2} value={ctaDesc} onChange={(e) => setCtaDesc(e.target.value)} className={`${inputCls} resize-none`} /></div>
          <button onClick={saveCMS} disabled={saving} className="w-fit px-8 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)] disabled:opacity-50">{saving ? "Saving..." : "Save All Changes"}</button>
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-semibold font-[var(--font-heading)]">⭐ Testimonials</h3>
          <button onClick={() => setShowTestimonialModal(true)} className="text-[12px] font-semibold text-primary bg-transparent border-none cursor-pointer font-[var(--font-heading)]">+ Add</button>
        </div>
        <div className="flex flex-col gap-3">
          {testimonials.map((t: Record<string, unknown>) => (
            <div key={t.id as string} className="p-4 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[14px] font-semibold font-[var(--font-heading)]">{t.name as string}</span>
                <span className="text-[11px] text-text-secondary">• {t.role as string}</span>
              </div>
              <p className="text-[13px] text-text-secondary italic">&quot;{t.content as string}&quot;</p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showTestimonialModal && (<>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTestimonialModal(false)} className="fixed inset-0 bg-black/40 z-[100]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90%] max-w-[480px] bg-white rounded-2xl p-8 z-[101] shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[20px] font-bold font-[var(--font-heading)]">Add Testimonial</h3>
              <button onClick={() => setShowTestimonialModal(false)} className="text-[20px] text-text-secondary bg-transparent border-none cursor-pointer">✕</button>
            </div>
            <form className="flex flex-col gap-3" onSubmit={addTestimonial}>
              <input type="text" value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Name" required className={inputCls} />
              <input type="text" value={tRole} onChange={(e) => setTRole(e.target.value)} placeholder="Role (e.g. Parent, Alumni)" required className={inputCls} />
              <textarea rows={3} value={tContent} onChange={(e) => setTContent(e.target.value)} placeholder="Testimonial content..." required className={`${inputCls} resize-none`} />
              <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)] disabled:opacity-50">{saving ? "Adding..." : "Add Testimonial"}</button>
            </form>
          </motion.div>
        </>)}
      </AnimatePresence>
    </>
  );
}
