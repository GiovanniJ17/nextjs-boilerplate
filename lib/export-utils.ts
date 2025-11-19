/**
 * Export Utilities
 * Funzioni per esportare dati in vari formati (CSV, PDF, PNG)
 */

import { notify } from './notifications';

export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    notify.exportNoData();
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

  notify.exportSuccess('CSV');
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
    notify.exportError('PNG', 'Grafico non trovato');
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
  // Report HTML migliorato con grafici e analisi dettagliata
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    notify.popupBlocked();
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          line-height: 1.6;
          color: #1e293b;
          background: white;
          padding: 40px;
        }
        .header {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6366f1 100%);
          color: white;
          padding: 40px;
          border-radius: 16px;
          margin-bottom: 40px;
        }
        .header h1 {
          font-size: 36px;
          margin-bottom: 10px;
          font-weight: 700;
        }
        .header .subtitle {
          font-size: 14px;
          opacity: 0.9;
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 24px;
          font-weight: 700;
          color: #8b5cf6;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 3px solid #8b5cf6;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .stat-card.highlight {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-color: #fbbf24;
        }
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #8b5cf6;
          margin-bottom: 5px;
        }
        .stat-label {
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th, td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        th {
          background: #8b5cf6;
          color: white;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        tr:nth-child(even) {
          background: #f8fafc;
        }
        tr:hover {
          background: #f1f5f9;
        }
        .insight-card {
          margin: 15px 0;
          padding: 20px;
          border-radius: 12px;
          border-left: 4px solid;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .insight-card.high {
          border-left-color: #ef4444;
          background: #fef2f2;
        }
        .insight-card.medium {
          border-left-color: #f59e0b;
          background: #fffbeb;
        }
        .insight-card.low {
          border-left-color: #10b981;
          background: #f0fdf4;
        }
        .insight-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .insight-desc {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 10px;
        }
        .insight-recommendation {
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
          padding: 10px;
          background: rgba(255,255,255,0.7);
          border-radius: 6px;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 10px;
        }
        .badge.success { background: #dcfce7; color: #166534; }
        .badge.warning { background: #fef3c7; color: #92400e; }
        .badge.danger { background: #fee2e2; color: #991b1b; }
        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
          text-align: center;
          color: #64748b;
          font-size: 12px;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
          .section { page-break-inside: avoid; }
        }
        @page {
          margin: 1.5cm;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 ${title}</h1>
        <div class="subtitle">
          <span>📅 ${new Date().toLocaleDateString('it-IT', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
          <span>⏰ ${new Date().toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</span>
        </div>
      </div>

      <!-- Statistiche Generali -->
      <div class="section">
        <h2 class="section-title">📈 Panoramica Generale</h2>
        <div class="stats-grid">
          <div class="stat-card highlight">
            <div class="stat-value">${stats.totalSessions || 0}</div>
            <div class="stat-label">Sessioni Totali</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalDistance?.toLocaleString('it-IT') || 0}</div>
            <div class="stat-label">Distanza Totale (m)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.avgRPE?.toFixed(1) || 'N/A'}</div>
            <div class="stat-label">RPE Medio</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalBlocks || 0}</div>
            <div class="stat-label">Blocchi Allenamento</div>
          </div>
          ${stats.avgSpeed ? `
            <div class="stat-card">
              <div class="stat-value">${stats.avgSpeed.toFixed(2)}</div>
              <div class="stat-label">Velocità Media (m/s)</div>
            </div>
          ` : ''}
          ${stats.totalExercises ? `
            <div class="stat-card">
              <div class="stat-value">${stats.totalExercises}</div>
              <div class="stat-label">Esercizi Completati</div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Personal Bests -->
      ${stats.personalBests && stats.personalBests.length > 0 ? `
        <div class="section">
          <h2 class="section-title">🏆 Personal Bests</h2>
          <table>
            <thead>
              <tr>
                <th>Distanza</th>
                <th>Tempo</th>
                <th>Data</th>
                <th>Velocità</th>
                <th>Miglioramento</th>
              </tr>
            </thead>
            <tbody>
              ${stats.personalBests.slice(0, 10).map((pb: any) => `
                <tr>
                  <td><strong>${pb.distance}m</strong></td>
                  <td>${pb.time.toFixed(2)}s</td>
                  <td>${new Date(pb.date).toLocaleDateString('it-IT')}</td>
                  <td>${(pb.distance / pb.time).toFixed(2)} m/s</td>
                  <td>
                    ${pb.improvement 
                      ? `<span class="badge success">+${pb.improvement.toFixed(1)}%</span>` 
                      : '<span class="badge">Primo record</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Progresso Mensile -->
      ${stats.monthlyProgress && stats.monthlyProgress.length > 0 ? `
        <div class="section">
          <h2 class="section-title">📅 Progresso Mensile</h2>
          <table>
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Sessioni</th>
                <th>Distanza (m)</th>
                <th>Vel. Media</th>
                <th>PB</th>
              </tr>
            </thead>
            <tbody>
              ${stats.monthlyProgress.slice(-12).map((month: any) => `
                <tr>
                  <td><strong>${month.month}</strong></td>
                  <td>${month.sessions}</td>
                  <td>${month.distance?.toLocaleString('it-IT') || 0}</td>
                  <td>${month.avgSpeed ? month.avgSpeed.toFixed(2) + ' m/s' : 'N/A'}</td>
                  <td>${month.pbs || 0} ${month.pbs > 0 ? '🎯' : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Analisi Carico -->
      ${stats.trainingLoad && stats.trainingLoad.length > 0 ? `
        <div class="section">
          <h2 class="section-title">⚡ Carico Allenamento</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Carico</th>
                <th>Acuto (7gg)</th>
                <th>Cronico (28gg)</th>
                <th>Ratio A:C</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              ${stats.trainingLoad.slice(-10).map((item: any) => {
                const status = item.ratio > 1.5 
                  ? { text: 'Alto rischio', class: 'danger' }
                  : item.ratio < 0.8 
                    ? { text: 'Basso', class: 'warning' }
                    : { text: 'Ottimale', class: 'success' };
                return `
                  <tr>
                    <td>${new Date(item.date).toLocaleDateString('it-IT')}</td>
                    <td>${item.load.toFixed(0)}</td>
                    <td>${item.acuteLoad.toFixed(0)}</td>
                    <td>${item.chronicLoad.toFixed(0)}</td>
                    <td><strong>${item.ratio.toFixed(2)}</strong></td>
                    <td><span class="badge ${status.class}">${status.text}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Smart Insights -->
      ${stats.smartInsights && stats.smartInsights.length > 0 ? `
        <div class="section">
          <h2 class="section-title">💡 Insights e Raccomandazioni</h2>
          ${stats.smartInsights.map((insight: any) => `
            <div class="insight-card ${insight.severity || 'low'}">
              <div class="insight-title">
                ${insight.severity === 'high' ? '⚠️' : insight.severity === 'medium' ? '⚡' : '✅'} 
                ${insight.title}
              </div>
              <div class="insight-desc">${insight.description}</div>
              <div class="insight-recommendation">
                <strong>💡 Raccomandazione:</strong> ${insight.recommendation}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Location Stats -->
      ${stats.locationStats && stats.locationStats.length > 0 ? `
        <div class="section">
          <h2 class="section-title">📍 Statistiche per Location</h2>
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Sessioni</th>
                <th>Performance Media</th>
                <th>Migliore</th>
              </tr>
            </thead>
            <tbody>
              ${stats.locationStats.map((loc: any) => `
                <tr>
                  <td><strong>${loc.location}</strong></td>
                  <td>${loc.sessions}</td>
                  <td>${loc.avgPerformance ? loc.avgPerformance.toFixed(2) + 's' : 'N/A'}</td>
                  <td>${loc.bestPerformance ? loc.bestPerformance.toFixed(2) + 's' : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="footer">
        <p><strong>Tracker Velocista</strong> - Report generato automaticamente</p>
        <p>Questo documento contiene dati sensibili. Mantenere riservato.</p>
      </div>

      <div class="no-print" style="position: fixed; bottom: 20px; right: 20px; display: flex; gap: 10px;">
        <button onclick="window.print()" style="
          padding: 12px 24px;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);
        ">
          🖨️ Stampa / Salva PDF
        </button>
        <button onclick="window.close()" style="
          padding: 12px 24px;
          background: #64748b;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        ">
          ✖️ Chiudi
        </button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  notify.exportSuccess('PDF');
}
