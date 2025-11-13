import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";

// Export Excel avanzato con formattazione
export async function exportToExcel() {
  try {
    console.log("Starting Excel export...");
    
    // Check se Supabase è configurato
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
        process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
      throw new Error("Supabase non configurato. Aggiungi le variabili d'ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    
    // Fetch tutti i dati
    const { data: sessions, error } = await supabase
      .from("training_sessions")
      .select("*")
      .order("date", { ascending: false });

    console.log("Fetched sessions:", sessions?.length, "Error:", error);

    if (error) throw new Error(`Errore database: ${error.message}`);
    if (!sessions || sessions.length === 0) {
      throw new Error("Nessun allenamento da esportare");
    }

    console.log("Creating workbook...");

    // Crea workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Allenamenti completi
    const sessionsFormatted = sessions.map((s) => ({
      Data: new Date(s.date).toLocaleDateString("it-IT"),
      Tipo: s.type || "N/A",
      Titolo: s.title || "N/A",
      Fase: s.phase || "N/A",
      Luogo: s.location || "N/A",
      Note: s.notes || "",
    }));
    const ws1 = XLSX.utils.json_to_sheet(sessionsFormatted);
    
    // Imposta larghezza colonne
    ws1["!cols"] = [
      { wch: 12 }, // Data
      { wch: 15 }, // Tipo
      { wch: 30 }, // Titolo
      { wch: 15 }, // Fase
      { wch: 15 }, // Luogo
      { wch: 40 }, // Note
    ];

    XLSX.utils.book_append_sheet(wb, ws1, "Allenamenti");

    // Sheet 2: Statistiche per tipo
    const statsByType = sessions.reduce((acc: any, s) => {
      const tipo = s.type || "N/A";
      if (!acc[tipo]) {
        acc[tipo] = {
          Tipo: tipo,
          Sessioni: 0,
        };
      }
      acc[tipo].Sessioni += 1;
      return acc;
    }, {});

    const ws2 = XLSX.utils.json_to_sheet(Object.values(statsByType));
    ws2["!cols"] = [{ wch: 15 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Statistiche per Tipo");

    // Sheet 3: Trend mensili
    const monthlyData = sessions.reduce((acc: any, s) => {
      const date = new Date(s.date);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!acc[month]) {
        acc[month] = {
          Mese: month,
          Sessioni: 0,
        };
      }
      acc[month].Sessioni += 1;
      return acc;
    }, {});

    const ws3 = XLSX.utils.json_to_sheet(
      Object.values(monthlyData).sort((a: any, b: any) => b.Mese.localeCompare(a.Mese))
    );
    ws3["!cols"] = [{ wch: 12 }, { wch: 10 }];
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
    // Check se Supabase è configurato
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
        process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
      throw new Error("Supabase non configurato. Aggiungi le variabili d'ambiente nelle impostazioni di Cloudflare Pages");
    }
    
    // Fetch completo con tutte le tabelle correlate usando join
    const { data: sessions, error } = await supabase
      .from("training_sessions")
      .select(`
        *,
        exercise_blocks (
          *,
          exercises (
            *,
            exercise_results (*)
          )
        ),
        metrics (*)
      `)
      .order("date", { ascending: false });

    if (error) throw error;

    // Fetch anche training_blocks separatamente
    const { data: trainingBlocks } = await supabase
      .from("training_blocks")
      .select("*")
      .order("start_date", { ascending: false });

    const backup = {
      version: "2.0", // Versione aggiornata per backup completo
      exportDate: new Date().toISOString(),
      totalSessions: sessions?.length || 0,
      sessions: sessions || [],
      training_blocks: trainingBlocks || [],
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
    // Check se Supabase è configurato
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
        process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
      throw new Error("Supabase non configurato. Aggiungi le variabili d'ambiente nelle impostazioni di Cloudflare Pages");
    }
    
    const text = await file.text();
    const backup = JSON.parse(text);

    if (!backup.sessions || !Array.isArray(backup.sessions)) {
      throw new Error("File di backup non valido");
    }

    // Gestisci sia versione 1.0 (solo sessions) che 2.0 (completo)
    const isFullBackup = backup.version === "2.0";

    // Fetch existing sessions per check duplicati
    const { data: existingSessions } = await supabase
      .from("training_sessions")
      .select("date, type, location");

    const existingKeys = new Set(
      existingSessions?.map((s) => `${s.date}-${s.type}-${s.location}`) || []
    );

    let imported = 0;
    let duplicates = 0;

    // Importa training_blocks se presente (solo per v2.0)
    const blockIdMapping = new Map<string, string>(); // old_id -> new_id
    if (isFullBackup && backup.training_blocks && Array.isArray(backup.training_blocks)) {
      for (const block of backup.training_blocks) {
        const oldId = block.id;
        const { id, created_at, ...blockData } = block;
        
        const { data: newBlock, error } = await supabase
          .from("training_blocks")
          .insert([blockData])
          .select("id")
          .single();
        
        if (!error && newBlock) {
          blockIdMapping.set(oldId, newBlock.id);
        }
      }
    }

    // Importa sessions con tutte le relazioni
    for (const session of backup.sessions) {
      const key = `${session.date}-${session.type}-${session.location}`;
      
      if (existingKeys.has(key)) {
        duplicates++;
        continue;
      }

      const oldSessionId = session.id;
      const oldBlockId = session.block_id;

      // Prepara dati sessione
      const { id, block_id, created_at, exercise_blocks, metrics, ...sessionData } = session;
      
      // Mappa block_id se presente
      if (oldBlockId && blockIdMapping.has(oldBlockId)) {
        sessionData.block_id = blockIdMapping.get(oldBlockId);
      }

      // Inserisci sessione
      const { data: newSession, error: sessionError } = await supabase
        .from("training_sessions")
        .insert([sessionData])
        .select("id")
        .single();

      if (sessionError || !newSession) {
        console.error("Errore inserimento sessione:", sessionError);
        continue;
      }

      const newSessionId = newSession.id;
      imported++;
      existingKeys.add(key);

      // Importa exercise_blocks se presente (solo per v2.0)
      if (isFullBackup && exercise_blocks && Array.isArray(exercise_blocks)) {
        for (const block of exercise_blocks) {
          const oldBlockId = block.id;
          const { id, session_id, created_at, exercises, ...blockData } = block;

          const { data: newBlock, error: blockError } = await supabase
            .from("exercise_blocks")
            .insert([{ ...blockData, session_id: newSessionId }])
            .select("id")
            .single();

          if (blockError || !newBlock) {
            console.error("Errore inserimento exercise_block:", blockError);
            continue;
          }

          const newBlockId = newBlock.id;

          // Importa exercises
          if (exercises && Array.isArray(exercises)) {
            for (const exercise of exercises) {
              const { id, block_id, created_at, exercise_results, ...exerciseData } = exercise;

              const { data: newExercise, error: exerciseError } = await supabase
                .from("exercises")
                .insert([{ ...exerciseData, block_id: newBlockId }])
                .select("id")
                .single();

              if (exerciseError || !newExercise) {
                console.error("Errore inserimento exercise:", exerciseError);
                continue;
              }

              const newExerciseId = newExercise.id;

              // Importa exercise_results
              if (exercise_results && Array.isArray(exercise_results)) {
                const resultsToInsert = exercise_results.map(result => {
                  const { id, exercise_id, created_at, ...resultData } = result;
                  return { ...resultData, exercise_id: newExerciseId };
                });

                if (resultsToInsert.length > 0) {
                  const { error: resultsError } = await supabase
                    .from("exercise_results")
                    .insert(resultsToInsert);

                  if (resultsError) {
                    console.error("Errore inserimento exercise_results:", resultsError);
                  }
                }
              }
            }
          }
        }
      }

      // Importa metrics se presente (solo per v2.0)
      if (isFullBackup && metrics && Array.isArray(metrics)) {
        const metricsToInsert = metrics.map(metric => {
          const { id, session_id, created_at, ...metricData } = metric;
          return { ...metricData, session_id: newSessionId };
        });

        if (metricsToInsert.length > 0) {
          const { error: metricsError } = await supabase
            .from("metrics")
            .insert(metricsToInsert);

          if (metricsError) {
            console.error("Errore inserimento metrics:", metricsError);
          }
        }
      }
    }

    return { success: true, count: imported, duplicates };
  } catch (error) {
    console.error("Restore error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Errore sconosciuto" };
  }
}
