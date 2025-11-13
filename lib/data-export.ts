import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";

// Export Excel avanzato con formattazione
export async function exportToExcel() {
  try {
    console.log("Starting Excel export...");
    
    // Fetch tutti i dati
    const { data: sessions, error } = await supabase
      .from("allenamenti")
      .select("*")
      .order("data", { ascending: false });

    console.log("Fetched sessions:", sessions?.length, "Error:", error);

    if (error) throw error;
    if (!sessions || sessions.length === 0) {
      throw new Error("Nessun allenamento da esportare");
    }

    console.log("Creating workbook...");

    // Crea workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Allenamenti completi
    const sessionsFormatted = sessions.map((s) => ({
      Data: new Date(s.data).toLocaleDateString("it-IT"),
      Tipo: s.tipo_allenamento,
      Blocco: s.blocco || "N/A",
      "Distanza (m)": s.distanza_totale,
      "Volume (m)": s.volume_totale,
      Ripetizioni: s.ripetizioni || "N/A",
      Recupero: s.recupero || "N/A",
      Intensità: s.intensita,
      "RPE Tecnico": s.rpe_tecnico,
      "RPE Fisico": s.rpe_fisico,
      Note: s.note || "",
    }));
    const ws1 = XLSX.utils.json_to_sheet(sessionsFormatted);
    
    // Imposta larghezza colonne
    ws1["!cols"] = [
      { wch: 12 }, // Data
      { wch: 15 }, // Tipo
      { wch: 12 }, // Blocco
      { wch: 12 }, // Distanza
      { wch: 12 }, // Volume
      { wch: 15 }, // Ripetizioni
      { wch: 12 }, // Recupero
      { wch: 10 }, // Intensità
      { wch: 12 }, // RPE Tecnico
      { wch: 12 }, // RPE Fisico
      { wch: 30 }, // Note
    ];

    XLSX.utils.book_append_sheet(wb, ws1, "Allenamenti");

    // Sheet 2: Statistiche per tipo
    const statsByType = sessions.reduce((acc: any, s) => {
      const tipo = s.tipo_allenamento;
      if (!acc[tipo]) {
        acc[tipo] = {
          Tipo: tipo,
          Sessioni: 0,
          "Volume Tot (m)": 0,
          "Distanza Tot (m)": 0,
          "Intensità Media": 0,
        };
      }
      acc[tipo].Sessioni += 1;
      acc[tipo]["Volume Tot (m)"] += s.volume_totale || 0;
      acc[tipo]["Distanza Tot (m)"] += s.distanza_totale || 0;
      acc[tipo]["Intensità Media"] += s.intensita || 0;
      return acc;
    }, {});

    Object.values(statsByType).forEach((stat: any) => {
      stat["Intensità Media"] = Math.round(stat["Intensità Media"] / stat.Sessioni);
    });

    const ws2 = XLSX.utils.json_to_sheet(Object.values(statsByType));
    ws2["!cols"] = [{ wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Statistiche per Tipo");

    // Sheet 3: Trend mensili
    const monthlyData = sessions.reduce((acc: any, s) => {
      const date = new Date(s.data);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!acc[month]) {
        acc[month] = {
          Mese: month,
          Sessioni: 0,
          "Volume (m)": 0,
          "Distanza (m)": 0,
        };
      }
      acc[month].Sessioni += 1;
      acc[month]["Volume (m)"] += s.volume_totale || 0;
      acc[month]["Distanza (m)"] += s.distanza_totale || 0;
      return acc;
    }, {});

    const ws3 = XLSX.utils.json_to_sheet(
      Object.values(monthlyData).sort((a: any, b: any) => b.Mese.localeCompare(a.Mese))
    );
    ws3["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Trend Mensili");

    console.log("Generating Excel file...");

    // Genera file e download
    const fileName = `tracker-velocista-export-${new Date().toISOString().split("T")[0]}.xlsx`;
    
    // Converti in binary string
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    console.log("Creating blob and downloading...");
    
    // Crea blob e download
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log("Excel export completed successfully");

    return { success: true, fileName };
  } catch (error) {
    console.error("Export Excel error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Errore sconosciuto" };
  }
}

// Backup completo dei dati
export async function backupData() {
  try {
    const { data: sessions, error } = await supabase
      .from("allenamenti")
      .select("*")
      .order("data", { ascending: false });

    if (error) throw error;

    const backup = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      totalSessions: sessions?.length || 0,
      sessions: sessions || [],
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tracker-velocista-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, count: backup.totalSessions };
  } catch (error) {
    console.error("Backup error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Errore sconosciuto" };
  }
}

// Restore dati da backup
export async function restoreData(file: File): Promise<{ success: boolean; error?: string; count?: number; duplicates?: number }> {
  try {
    const text = await file.text();
    const backup = JSON.parse(text);

    if (!backup.sessions || !Array.isArray(backup.sessions)) {
      throw new Error("File di backup non valido");
    }

    // Fetch existing sessions per check duplicati
    const { data: existingSessions } = await supabase
      .from("allenamenti")
      .select("data, tipo_allenamento, distanza_totale");

    const existingKeys = new Set(
      existingSessions?.map((s) => `${s.data}-${s.tipo_allenamento}-${s.distanza_totale}`) || []
    );

    let imported = 0;
    let duplicates = 0;

    for (const session of backup.sessions) {
      const key = `${session.data}-${session.tipo_allenamento}-${session.distanza_totale}`;
      
      if (existingKeys.has(key)) {
        duplicates++;
        continue;
      }

      // Rimuovi id per evitare conflitti
      const { id, ...sessionData } = session;

      const { error } = await supabase.from("allenamenti").insert([sessionData]);

      if (!error) {
        imported++;
        existingKeys.add(key);
      }
    }

    return { success: true, count: imported, duplicates };
  } catch (error) {
    console.error("Restore error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Errore sconosciuto" };
  }
}
