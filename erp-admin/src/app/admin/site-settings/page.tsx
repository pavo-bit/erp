"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/DashboardLayout";
import { apiCall, invalidateAll } from "@/lib/api-hooks";

export default function SiteSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  
  // Stats form state
  const [boardResults, setBoardResults] = useState("");
  const [studentCount, setStudentCount] = useState("");
  const [teacherCount, setTeacherCount] = useState("");
  const [awardsCount, setAwardsCount] = useState("");
  const [establishmentYear, setEstablishmentYear] = useState("");

  // Load current values
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await fetch("/api/site-content?section=homepage_stats", { credentials: "include" });
        const result = await data.json();
        if (result.success && result.data?.homepage_stats) {
          const stats = result.data.homepage_stats;
          setBoardResults(stats.board_results || "");
          setStudentCount(stats.student_count || "");
          setTeacherCount(stats.teacher_count || "");
          setAwardsCount(stats.awards_count || "");
          setEstablishmentYear(stats.establishment_year || "");
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const updates = [];
      
      if (boardResults) {
        updates.push({ section: "homepage_stats", key: "board_results", value: boardResults, type: "number" });
      }
      if (studentCount) {
        updates.push({ section: "homepage_stats", key: "student_count", value: studentCount, type: "number" });
      }
      if (teacherCount) {
        updates.push({ section: "homepage_stats", key: "teacher_count", value: teacherCount, type: "number" });
      }
      if (awardsCount) {
        updates.push({ section: "homepage_stats", key: "awards_count", value: awardsCount, type: "number" });
      }
      if (establishmentYear) {
        updates.push({ section: "homepage_stats", key: "establishment_year", value: establishmentYear, type: "text" });
      }

      await apiCall("/api/site-content", "PUT", { updates });
      invalidateAll("/api/stats");
      setMessage("✅ Settings saved successfully!");
      
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(`❌ Error: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setBoardResults("");
    setStudentCount("");
    setTeacherCount("");
    setAwardsCount("");
    setEstablishmentYear("");
    setMessage("ℹ️ Form cleared. Leave fields empty to use auto-calculated values.");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <>
      <PageHeader
        title="Site Settings"
        subtitle="Manage homepage statistics and site content"
      />

      <div className="max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-border p-8"
        >
          <div className="mb-6">
            <h3 className="text-[18px] font-bold text-text-primary mb-2 font-[var(--font-heading)]">
              Homepage Statistics
            </h3>
            <p className="text-[13px] text-text-secondary">
              Override homepage stats manually. Leave fields empty to use auto-calculated values from the database.
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg text-[13px] font-medium ${
              message.startsWith("✅") ? "bg-green-50 text-green-700" :
              message.startsWith("❌") ? "bg-red-50 text-red-700" :
              "bg-blue-50 text-blue-700"
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[12px] font-semibold text-text-primary mb-2 font-[var(--font-heading)]">
                  Board Results (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={boardResults}
                  onChange={(e) => setBoardResults(e.target.value)}
                  placeholder="Auto-calculated from results"
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary"
                />
                <p className="text-[11px] text-text-secondary mt-1">
                  Leave empty to auto-calculate from student results
                </p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-text-primary mb-2 font-[var(--font-heading)]">
                  Student Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={studentCount}
                  onChange={(e) => setStudentCount(e.target.value)}
                  placeholder="Auto-counted from database"
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary"
                />
                <p className="text-[11px] text-text-secondary mt-1">
                  Leave empty to auto-count from student records
                </p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-text-primary mb-2 font-[var(--font-heading)]">
                  Teacher Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={teacherCount}
                  onChange={(e) => setTeacherCount(e.target.value)}
                  placeholder="Auto-counted from database"
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary"
                />
                <p className="text-[11px] text-text-secondary mt-1">
                  Leave empty to auto-count from faculty records
                </p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-text-primary mb-2 font-[var(--font-heading)]">
                  Awards Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={awardsCount}
                  onChange={(e) => setAwardsCount(e.target.value)}
                  placeholder="Default: 250"
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary"
                />
                <p className="text-[11px] text-text-secondary mt-1">
                  Manual entry required (no auto-calculation)
                </p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-text-primary mb-2 font-[var(--font-heading)]">
                  Establishment Year
                </label>
                <input
                  type="text"
                  value={establishmentYear}
                  onChange={(e) => setEstablishmentYear(e.target.value)}
                  placeholder="Default: 1987"
                  className="w-full px-4 py-2.5 rounded-lg border border-border text-[13px] outline-none focus:border-primary"
                />
                <p className="text-[11px] text-text-secondary mt-1">
                  School establishment year
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white border-none cursor-pointer gradient-btn font-[var(--font-heading)] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-text-secondary border border-border bg-white cursor-pointer font-[var(--font-heading)] hover:bg-surface disabled:opacity-50"
              >
                Clear Form
              </button>
            </div>
          </form>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-[13px] font-semibold text-blue-900 mb-2">ℹ️ How it works</h4>
            <ul className="text-[12px] text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>Board Results:</strong> Auto-calculated from student exam results (pass rate)</li>
              <li><strong>Student Count:</strong> Auto-counted from active student records</li>
              <li><strong>Teacher Count:</strong> Auto-counted from active faculty records</li>
              <li><strong>Awards Count:</strong> Must be set manually (no database tracking yet)</li>
              <li><strong>Manual Override:</strong> Any value you enter here will override the auto-calculated value</li>
              <li><strong>Clear to Reset:</strong> Clear a field to go back to auto-calculation</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </>
  );
}
