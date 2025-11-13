# 📱 Tracker Velocista - Guida Utente

## 🚀 Caratteristiche Principali

### ✅ Registrazione Allenamenti
- **Sessioni complete** con data, tipo, location e blocchi
- **Esercizi dettagliati** con distanza, serie, ripetizioni e intensità
- **Metriche personalizzate** per test e massimali
- **Quick-select** per valori comuni (distanze, recuperi)
- **Auto-compilazione** intelligente dei campi

### 📊 Storico Sessioni
- **Ricerca avanzata** con debouncing per performance ottimali
- **Filtri intelligenti**: tipo, blocco, distanza, periodo
- **Smart ranges**: 7/14/30/90 giorni, mese corrente, anno corrente
- **Ordinamento flessibile**: data, volume, intensità
- **Paginazione configurabile**: 10/25/50/100 items per pagina
- **Persistenza filtri**: i tuoi filtri vengono salvati automaticamente

### 📈 Statistiche Avanzate
- **4 sezioni**: Panoramica, Grafici, Analisi Avanzate, Insights & Consigli
- **Personal Bests** tracciati per distanza
- **Trend performance** con analisi miglioramenti/peggioramenti
- **Distribuzione intensità** e RPE
- **Volume settimanale** e densità allenamento
- **Insights intelligenti** basati sui tuoi dati
- **Filtri persistenti** per analisi ricorrenti

## 🎯 Quick Start

### 1. Registra un Allenamento
1. Vai su **Registro**
2. Compila data, tipo e location (usa quick-select per location comuni)
3. Crea un blocco di esercizi
4. Aggiungi esercizi usando i pulsanti quick-select:
   - **Distanze comuni**: 30/60/100/150/200/300/400m
   - **Recuperi standard**: 60s/90s/2min/3min/5min
   - **Intensità con label**: Leggero/Medio/Alto/Massimo
5. Salva la sessione

### 2. Consulta lo Storico
1. Vai su **Storico**
2. Usa smart ranges per periodo rapido (es. "Ultimi 30 giorni")
3. Filtra per tipo sessione o blocco allenamento
4. Cerca per parole chiave (location, note, esercizi)
5. Ordina per data/volume/intensità
6. I filtri vengono salvati automaticamente!

### 3. Analizza Statistiche
1. Vai su **Statistiche**
2. Seleziona periodo con smart ranges
3. Filtra per tipo sessione, blocco, distanza
4. Esplora le 4 tab:
   - **Panoramica**: metriche chiave
   - **Grafici**: visualizzazioni temporali
   - **Analisi Avanzate**: PB, RPE, recovery
   - **Insights**: consigli personalizzati (badge rosso indica quanti!)

## 🔧 Funzionalità Tecniche

### Performance
- ✅ **Debouncing ricerca** (300ms) - meno query al database
- ✅ **Limit 500 sessioni** - caricamento ottimizzato
- ✅ **Skeleton loaders** - feedback visivo durante caricamento
- ✅ **Error boundaries** - gestione errori graceful
- ✅ **Persistenza localStorage** - filtri salvati automaticamente

### PWA (Progressive Web App)
- ✅ **Installabile** come app su mobile/desktop
- ✅ **Offline ready** con manifest.json
- ✅ **Shortcuts** rapidi per Registro/Storico/Statistiche
- ✅ **Theme color** adattivo

### Accessibilità
- ✅ **Skeleton states** per loading
- ✅ **Toast notifications** per feedback operazioni
- ✅ **Aria labels** su elementi interattivi
- ✅ **Responsive design** mobile-first

## 💡 Tips & Tricks

### Registro Veloce
- Usa **TAB** per navigare tra i campi
- I **quick-select** riempiono automaticamente i valori comuni
- L'**auto-advance** ti porta alla sezione successiva quando completi quella corrente
- L'**auto-scroll** ti porta al nuovo esercizio appena aggiunto

### Ricerca Efficiente
- Usa **smart ranges** invece di date manuali
- **Quick searches** per filtri comuni (Test, Gara, Pista, ecc.)
- Il **debouncing** aspetta che finisci di digitare prima di cercare

### Analisi Profonda
- Controlla il **badge su Insights tab** per vedere quanti consigli hai
- Usa **filtri distanza specifici** (60m, 100m, 200m, 400m) per analisi mirate
- I **PB** sono evidenziati automaticamente
- Gli **alert** ti avvisano di pattern preoccupanti

## 🐛 Troubleshooting

### I miei filtri si sono resettati
- **Causa**: Vecchia versione senza persistenza
- **Soluzione**: Ricarica la pagina - ora sono salvati automaticamente!

### Non vedo tutte le mie sessioni
- **Verifica**: Controlla i filtri attivi (potrebbero limitare i risultati)
- **Soluzione**: Clicca "Reset" per rimuovere tutti i filtri

### Le statistiche sembrano sbagliate
- **Verifica**: Controlla periodo selezionato e filtri attivi
- **Nota**: Counter mostra "Analizzando X sessioni" - verifica che sia il numero atteso

### L'app è lenta
- **Causa**: Troppe sessioni caricate o filtri complessi
- **Soluzione**: Usa smart ranges per ridurre periodo analizzato

## 📱 Installazione PWA

### Su Mobile (Android/iOS)
1. Apri l'app nel browser
2. Tocca menu browser (⋮ o ⋯)
3. Seleziona "Aggiungi a Home"
4. Conferma installazione

### Su Desktop (Chrome/Edge)
1. Clicca icona installazione nella barra indirizzi
2. Oppure: Menu → "Installa Tracker Velocista"
3. L'app apparirà come applicazione nativa

## 🔐 Privacy & Dati

- **Storage locale**: I filtri sono salvati nel tuo browser
- **Database**: Supabase (PostgreSQL) sicuro e criptato
- **No tracking**: Nessun analytics o cookie di terze parti
- **Dati personali**: Restano solo sul tuo account

## 📝 Changelog

### v0.2.0 - Novembre 2025
- ✅ Persistenza filtri con localStorage
- ✅ Debouncing ricerca e filtri
- ✅ Skeleton loaders e error boundaries
- ✅ Limit sessioni aumentato a 500
- ✅ PWA manifest completo
- ✅ Metadata SEO ottimizzati

### v0.1.2 - Novembre 2025
- ✅ UX migliorie complete (Registro, Storico, Statistiche)
- ✅ Smart ranges espansi (7 opzioni)
- ✅ Filtri distanza specifici
- ✅ Quick-select buttons
- ✅ Auto-scroll e auto-advance
- ✅ Counter risultati visibili
- ✅ Tab badges per insights

## 🆘 Supporto

Per bug, suggerimenti o domande, contatta il team di sviluppo!

---

**Made with ❤️ for athletes**
