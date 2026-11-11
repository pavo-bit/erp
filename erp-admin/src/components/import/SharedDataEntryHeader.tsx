"use client";

import React, { useState } from "react";
import { Plus, Upload, HelpCircle, FileSpreadsheet } from "lucide-react";
import { BulkImportWizardModal } from "./BulkImportWizardModal";
import { ExcelFormatHelpModal } from "./ExcelFormatHelpModal";

interface SharedDataEntryHeaderProps {
  title: string;
  description?: string;
  moduleId: string; // e.g. "students", "staff", "guardians", "classes", "attendance", "fees", "subjects"
  entityName: string; // e.g. "Student"
  onAddNew?: () => void;
  onImportSuccess?: () => void;
  extraActions?: React.ReactNode;
}

export function SharedDataEntryHeader({
  title,
  description,
  moduleId,
  entityName,
  onAddNew,
  onImportSuccess,
  extraActions,
}: SharedDataEntryHeaderProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-heading)] text-text-primary">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-text-secondary mt-1">{description}</p>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {extraActions}

          {/* Excel Format & Help Button */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold shadow-sm transition"
            title="View column definitions, accepted aliases, and download templates"
          >
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            <span>Excel Format & Help</span>
          </button>

          {/* Bulk Import Button */}
          <button
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-hover border border-border text-text-primary rounded-xl text-xs font-semibold shadow-sm transition"
            title={`Bulk import ${entityName} from Excel or CSV`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bulk Import</span>
          </button>

          {/* Single Add New Button */}
          {onAddNew && (
            <button
              onClick={onAddNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New {entityName}</span>
            </button>
          )}
        </div>
      </div>

      {/* Excel Format Help Dialog */}
      <ExcelFormatHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        moduleId={moduleId}
      />

      {/* Bulk Import Wizard Dialog */}
      <BulkImportWizardModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        moduleId={moduleId}
        entityName={entityName}
        onSuccess={() => {
          if (onImportSuccess) onImportSuccess();
        }}
      />
    </>
  );
}

