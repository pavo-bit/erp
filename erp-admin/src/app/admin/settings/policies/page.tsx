"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/DashboardLayout";
import { Shield, Database, Clock, Save, CheckCircle2, HardDrive } from "lucide-react";

export default function PoliciesAndRetentionPage() {
  const [retentionYears, setRetentionYears] = useState("7");
  const [autoPurgeLogs, setAutoPurgeLogs] = useState(false);
  const [glacierArchival, setGlacierArchival] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies & Data Retention"
        subtitle="Configure institution data protection, compliance retention schedules, and automated cloud archival."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Data Retention Schedules */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-text-primary">Financial & Academic Retention</h3>
              <p className="text-xs text-text-secondary">Statutory compliance period for student transcripts and receipts.</p>
            </div>
          </div>

          <div className="space-y-4 pt-2 text-xs">
            <div>
              <label className="font-bold text-text-primary block mb-1.5">
                Statutory Retention Duration
              </label>
              <select
                value={retentionYears}
                onChange={(e) => setRetentionYears(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="5">5 Years (Minimum Audit Period)</option>
                <option value="7">7 Years (Recommended Indian Income Tax & CBSE Standard)</option>
                <option value="10">10 Years (Extended Institution Records)</option>
                <option value="99">Permanent / Indefinite Archival</option>
              </select>
            </div>

            <div className="p-3 bg-surface rounded-xl border border-border text-[11px] text-text-secondary">
              Soft-deleted records (<code className="text-primary font-mono">deletedAt</code>) are kept in the database during this period.
            </div>
          </div>
        </div>

        {/* Card 2: Cloud Archival Policies */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-text-primary">Cloud Vault & Archival Tiering</h3>
              <p className="text-xs text-text-secondary">AWS S3 Glacier Deep Archive integration for closed sessions.</p>
            </div>
          </div>

          <div className="space-y-4 pt-2 text-xs">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={glacierArchival}
                onChange={(e) => setGlacierArchival(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
              >
              </input>
              <div>
                <span className="font-bold text-text-primary">Automated Glacier Deep Archival</span>
                <p className="text-text-secondary mt-0.5">
                  Transfer closed financial period ledger copies to immutable AWS S3 Vault.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPurgeLogs}
                onChange={(e) => setAutoPurgeLogs(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
              >
              </input>
              <div>
                <span className="font-bold text-text-primary">Auto-purge ephemeral telemetry logs</span>
                <p className="text-text-secondary mt-0.5">
                  Vehicle GPS points older than 90 days are compressed into monthly trip aggregates.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border">
        <span className="text-xs text-text-secondary">
          Security and retention policies apply across all institutional branches.
        </span>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Policies Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Retention Policies</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

