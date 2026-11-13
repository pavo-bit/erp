"use client";

import React, { useState, useEffect } from "react";
import { X, Download, FileSpreadsheet, FileText, AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";

interface FieldDefinition {
  name: string;
  label: string;
  type: string;
  required: boolean;
  enumValues?: string[];
  description: string;
  example: string | number;
  aliases: string[];
}

interface TemplateDefinition {
  moduleId: string;
  moduleName: string;
  category: string;
  description: string;
  uniqueIdentifier: string;
  fields: FieldDefinition[];
  relationships?: Array<{ field: string; entity: string; description: string }>;
}

interface ExcelFormatHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
}

export function ExcelFormatHelpModal({ isOpen, onClose, moduleId }: ExcelFormatHelpModalProps) {
  const [template, setTemplate] = useState<TemplateDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !moduleId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/v1/admin/import/templates/${moduleId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load template specification");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setTemplate(data.data || null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Could not fetch template rules.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, moduleId]);

  if (!isOpen) return null;

  const handleDownload = (format: "xlsx" | "csv") => {
    window.open(`/api/v1/admin/import/templates/${moduleId}/download?format=${format}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                Excel & CSV Format Specification: {template?.moduleName || moduleId}
              </h2>
              <p className="text-xs text-text-secondary">
                Authoritative column contracts, data types, alias matching, and formatting guidelines.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {loading && (
            <div className="py-12 text-center text-text-secondary">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
              <p>Loading schema rules and requirements...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-error/10 border border-error/20 text-error rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {template && !loading && (
            <>
              {/* Guidance Alerts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Non-Compacting Column Rule</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Empty optional cells strictly retain their column position and map to database <code className="bg-primary/10 px-1 py-0.5 rounded text-primary font-mono">NULL</code>. 
                    Cells never shift left or compress rows. Do not write literal <em>"N/A"</em>, <em>"none"</em>, or dashes.
                  </p>
                </div>

                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-500">
                    <HelpCircle className="w-4 h-4" />
                    <span>Update vs. Clear Empty Fields</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    By default, when modifying existing records via matching unique identifier (<code className="bg-amber-500/10 px-1 py-0.5 rounded text-amber-600 font-mono">{template.uniqueIdentifier}</code>), 
                    empty cells leave current database values intact. To explicitly erase values, enable <strong>Clear empty fields</strong> in the import wizard.
                  </p>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border">
                <div>
                  <h4 className="font-bold text-text-primary">Download Ready-to-Use Templates</h4>
                  <p className="text-xs text-text-secondary">
                    Pre-populated with header rows, column widths, validation notes, and sample rows.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload("xlsx")}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleDownload("csv")}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-surface-hover border border-border text-text-primary rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    CSV (.csv)
                  </button>
                </div>
              </div>

              {/* Specification Table */}
              <div>
                <h3 className="font-bold text-text-primary mb-3 flex items-center justify-between">
                  <span>Accepted Column Contracts ({template.fields.length} Columns)</span>
                  <span className="text-xs font-normal text-text-secondary">
                    Matching is case-insensitive and normalizes spaces/underscores.
                  </span>
                </h3>

                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface border-b border-border text-text-secondary uppercase tracking-wider text-[11px] font-bold">
                          <th className="p-3">Field / Column Name</th>
                          <th className="p-3">Required</th>
                          <th className="p-3">Data Type</th>
                          <th className="p-3">Accepted Synonyms / Aliases</th>
                          <th className="p-3">Sample Value</th>
                          <th className="p-3">Description & Validation Rules</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-medium">
                        {template.fields.map((f) => (
                          <tr key={f.name} className="hover:bg-surface/50 transition">
                            <td className="p-3 font-mono font-bold text-text-primary">
                              {f.label}
                              <div className="text-[10px] text-text-secondary font-normal font-mono">
                                ({f.name})
                              </div>
                            </td>
                            <td className="p-3">
                              {f.required ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-error/10 text-error">
                                  MANDATORY
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface text-text-secondary border border-border">
                                  OPTIONAL
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="font-mono text-primary font-semibold">
                                {f.type.toUpperCase()}
                              </span>
                              {f.enumValues && (
                                <div className="text-[10px] text-text-secondary mt-1">
                                  [{f.enumValues.join(", ")}]
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-text-secondary">
                              <div className="flex flex-wrap gap-1">
                                {f.aliases.map((al) => (
                                  <span key={al} className="px-1.5 py-0.5 bg-surface rounded text-[10px] border border-border">
                                    {al}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 font-mono text-text-primary">
                              {String(f.example)}
                            </td>
                            <td className="p-3 text-text-secondary max-w-xs">
                              {f.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Relational Dependencies */}
              {template.relationships && template.relationships.length > 0 && (
                <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
                  <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">
                    Relational Placement Requirements
                  </h4>
                  <ul className="text-xs text-text-secondary space-y-1 list-disc pl-5">
                    {template.relationships.map((rel, idx) => (
                      <li key={idx}>
                        <strong className="text-text-primary">{rel.field}</strong>: {rel.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface/50 flex items-center justify-between">
          <span className="text-xs text-text-secondary">
            Enterprise School Bulk Import Specification • SSVM ERP
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}

