/**
 * Export Utilities
 * Funzioni per esportare dati in formato CSV e PDF
 */

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    alert('Nessun dato da esportare');
    return;
  }

  // Ottieni le chiavi (header) dal primo oggetto
  const headers = Object.keys(data[0]);
  
  // Crea il contenuto CSV
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Gestisci valori con virgole o newline
        if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  // Crea blob e scarica
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportStatisticsToCSV(stats: {
  personalBests: any[];
  monthlyProgress: any[];
  trainingLoad: any[];
  locationStats: any[];
  performanceTrends: any[];
}) {
  // Export Personal Bests
  if (stats.personalBests.length > 0) {
    const pbData = stats.personalBests.map(pb => ({
      Distanza_m: pb.distance,
      Tempo_s: pb.time.toFixed(2),
      Data: pb.date,
      Miglioramento_percentuale: pb.improvement ? `${pb.improvement.toFixed(2)}%` : 'N/A',
      Tipo_Sessione: pb.sessionType || 'N/A',
    }));
    exportToCSV(pbData, 'personal_bests');
  }

  // Export Monthly Progress
  if (stats.monthlyProgress.length > 0) {
    const monthlyData = stats.monthlyProgress.map(month => ({
      Mese: month.month,
      Sessioni: month.sessions,
      Distanza_totale_m: month.distance,
      Velocità_media_ms: month.avgSpeed ? month.avgSpeed.toFixed(2) : 'N/A',
      PB_raggiunti: month.pbs,
    }));
    exportToCSV(monthlyData, 'progresso_mensile');
  }

  // Export Training Load
  if (stats.trainingLoad.length > 0) {
    const loadData = stats.trainingLoad.map(item => ({
      Data: item.date,
      Carico: item.load.toFixed(2),
      Carico_Acuto_7gg: item.acuteLoad.toFixed(2),
      Carico_Cronico_28gg: item.chronicLoad.toFixed(2),
      Ratio_AC: item.ratio.toFixed(2),
      Stato: item.ratio > 1.5 ? 'Alto rischio' : item.ratio < 0.8 ? 'Sottocondizionamento' : 'Ottimale',
    }));
    exportToCSV(loadData, 'carico_allenamento');
  }

  // Export Location Stats
  if (stats.locationStats.length > 0) {
    const locationData = stats.locationStats.map(loc => ({
      Location: loc.location,
      Sessioni: loc.sessions,
      Performance_Media_s: loc.avgPerformance ? loc.avgPerformance.toFixed(2) : 'N/A',
      Miglior_Performance_s: loc.bestPerformance ? loc.bestPerformance.toFixed(2) : 'N/A',
    }));
    exportToCSV(locationData, 'statistiche_location');
  }

  // Export Performance Trends
  if (stats.performanceTrends.length > 0) {
    const trendData = stats.performanceTrends.map(trend => ({
      Distanza_m: trend.distance,
      Trend: trend.trend === 'improving' ? 'Miglioramento' : trend.trend === 'declining' ? 'Declino' : 'Stabile',
      Variazione_percentuale: `${trend.changePercentage.toFixed(2)}%`,
      Media_recente_s: trend.recentAvg.toFixed(2),
      Media_precedente_s: trend.previousAvg.toFixed(2),
    }));
    exportToCSV(trendData, 'trend_performance');
  }

  alert('Export completato! Controlla la cartella download.');
}

export function prepareChartForExport(chartId: string): string | null {
  // Trova il grafico SVG
  const chartElement = document.getElementById(chartId);
  if (!chartElement) return null;

  const svgElement = chartElement.querySelector('svg');
  if (!svgElement) return null;

  // Serializza SVG
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgElement);
}

export function downloadChartAsPNG(chartId: string, filename: string) {
  const svgString = prepareChartForExport(chartId);
  if (!svgString) {
    alert('Impossibile esportare il grafico');
    return;
  }

  // Crea canvas per convertire SVG in PNG
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    canvas.toBlob(blob => {
      if (!blob) return;
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  img.src = url;
}

export function generatePDFReport(stats: any, title: string) {
  // Per una implementazione completa PDF, si potrebbe usare jsPDF o pdfmake
  // Per ora creiamo una versione HTML stampabile
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Abilita i popup per generare il report PDF');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        h1 {
          color: #4f46e5;
          border-bottom: 3px solid #4f46e5;
          padding-bottom: 10px;
        }
        h2 {
          color: #6366f1;
          margin-top: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #4f46e5;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .metric-card {
          display: inline-block;
          margin: 10px;
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          min-width: 200px;
        }
        .metric-value {
          font-size: 32px;
          font-weight: bold;
          color: #4f46e5;
        }
        .metric-label {
          color: #6b7280;
          font-size: 14px;
        }
        @media print {
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p><strong>Data generazione:</strong> ${new Date().toLocaleDateString('it-IT')}</p>
      
      <h2>Statistiche Generali</h2>
      <div class="metric-card">
        <div class="metric-label">Sessioni Totali</div>
        <div class="metric-value">${stats.totalSessions || 0}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Distanza Totale (m)</div>
        <div class="metric-value">${stats.totalDistance?.toLocaleString('it-IT') || 0}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">RPE Medio</div>
        <div class="metric-value">${stats.avgRPE?.toFixed(1) || 'N/A'}</div>
      </div>

      ${stats.personalBests && stats.personalBests.length > 0 ? `
        <h2>Personal Bests</h2>
        <table>
          <thead>
            <tr>
              <th>Distanza (m)</th>
              <th>Tempo (s)</th>
              <th>Data</th>
              <th>Miglioramento</th>
            </tr>
          </thead>
          <tbody>
            ${stats.personalBests.map((pb: any) => `
              <tr>
                <td>${pb.distance}</td>
                <td>${pb.time.toFixed(2)}</td>
                <td>${new Date(pb.date).toLocaleDateString('it-IT')}</td>
                <td>${pb.improvement ? `${pb.improvement.toFixed(2)}%` : 'Primo record'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${stats.smartInsights && stats.smartInsights.length > 0 ? `
        <h2>Insights e Raccomandazioni</h2>
        ${stats.smartInsights.map((insight: any) => `
          <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-left: 4px solid ${
            insight.severity === 'high' ? '#ef4444' : insight.severity === 'medium' ? '#f59e0b' : '#10b981'
          }; border-radius: 4px;">
            <h3 style="margin-top: 0;">${insight.title}</h3>
            <p>${insight.description}</p>
            <p><strong>Raccomandazione:</strong> ${insight.recommendation}</p>
          </div>
        `).join('')}
      ` : ''}

      <div class="no-print" style="margin-top: 40px;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Stampa / Salva come PDF
        </button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
          Chiudi
        </button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
