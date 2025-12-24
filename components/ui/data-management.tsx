"use client";

import { useState, useRef } from "react";
import { Download, Upload, Database, CheckCircle, AlertCircle } from "lucide-react";
import { backupData, restoreData, exportToExcel } from "@/lib/data-export";
import { toast } from "sonner";

interface DataManagementProps {
  onDataChange?: () => void;
}

export function DataManagement({ onDataChange }: DataManagementProps = {}) {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    setIsBackingUp(true);
    const result = await backupData();
    setIsBackingUp(false);

    if (result.success) {
      toast.success(`✅ Backup completato! ${result.count} allenamenti salvati`);
    } else {
      toast.error(`❌ Errore backup: ${result.error}`);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    const result = await exportToExcel();
    setIsExporting(false);

    if (result.success) {
      toast.success(`✅ Export Excel completato! File: ${result.fileName}`);
    } else {
      toast.error(`❌ Errore export: ${result.error}`);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    const result = await restoreData(file);
    setIsRestoring(false);

    if (result.success) {
      toast.success(
        `✅ Restore completato! ${result.count} allenamenti importati${
          result.duplicates ? ` (${result.duplicates} duplicati saltati)` : ""
        }`
      );
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Notifica il parent per ricaricare i dati
      onDataChange?.();
    } else {
      toast.error(`❌ Errore restore: ${result.error}`);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {/* Backup JSON */}
      <button
        onClick={handleBackup}
        disabled={isBackingUp}
        className="flex flex-col items-center gap-2 rounded-lg border border-default bg-card p-4 transition-all hover:border-sky-300 hover:shadow-md disabled:opacity-50 surface-animated"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(255,255,255,0.03)]">
          <Database className="h-6 w-6 text-accent" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-default">Backup Dati</p>
          <p className="text-xs text-muted">Salva tutto (JSON)</p>
        </div>
        {isBackingUp && (
          <div className="h-1 w-full animate-pulse rounded-full bg-[rgba(255,255,255,0.03)]" />
        )}
      </button>

      {/* Export Excel */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex flex-col items-center gap-2 rounded-lg border border-default bg-card p-4 transition-all hover:border-green-300 hover:shadow-md disabled:opacity-50 surface-animated"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(255,255,255,0.03)]">
          <Download className="h-6 w-6 text-accent" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-default">Export Excel</p>
          <p className="text-xs text-muted">3 fogli con stats</p>
        </div>
        {isExporting && (
          <div className="h-1 w-full animate-pulse rounded-full bg-[rgba(255,255,255,0.03)]" />
        )}
      </button>

      {/* Restore */}
      <button
        onClick={handleRestoreClick}
        disabled={isRestoring}
        className="flex flex-col items-center gap-2 rounded-lg border border-default bg-card p-4 transition-all hover:border-orange-300 hover:shadow-md disabled:opacity-50 surface-animated"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(255,255,255,0.03)]">
          <Upload className="h-6 w-6 text-accent" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-default">Ripristina</p>
          <p className="text-xs text-muted">Da file JSON</p>
        </div>
        {isRestoring && (
          <div className="h-1 w-full animate-pulse rounded-full bg-[rgba(255,255,255,0.03)]" />
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
