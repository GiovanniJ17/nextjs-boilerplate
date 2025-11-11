# Fix Database Constraints - Tracker Velocista

## Problema Identificato

L'applicazione non riesce a salvare le sessioni di allenamento a causa di un **mismatch tra i valori usati nel codice e i constraint CHECK del database PostgreSQL/Supabase**.

### Dettagli degli errori:

1. **Campo `discipline_type` nella tabella `exercises`:**
   - ❌ Valori nel database: `'sprint', 'forza', 'mobilità', 'tecnica', 'altro'`
   - ✅ Valori usati nel codice: `'accelerazioni', 'partenze', 'allunghi', 'resistenza', 'tecnica', 'mobilità'`

2. **Campo `category` nella tabella `metrics`:**
   - ❌ Valori nel database: `'prestazione', 'fisico', 'recupero', 'test', 'altro'`
   - ✅ Valori usati nel codice: `'gara', 'test', 'massimale'`

## Soluzione

### Opzione 1: Applicare la migrazione tramite Supabase Dashboard (Consigliato)

1. Vai alla [Supabase Dashboard](https://app.supabase.com)
2. Seleziona il tuo progetto
3. Vai su **SQL Editor** nel menu laterale
4. Copia e incolla il contenuto del file `fix_discipline_type_constraint.sql`
5. Clicca su **Run** per eseguire lo script

### Opzione 2: Applicare la migrazione tramite CLI

Se hai installato Supabase CLI:

```bash
# Accedi a Supabase
supabase login

# Collega il progetto
supabase link --project-ref <tuo-project-ref>

# Esegui la migrazione
psql $DATABASE_URL -f fix_discipline_type_constraint.sql
```

### Opzione 3: Migrazione manuale

Se preferisci, puoi eseguire i comandi SQL uno alla volta:

```sql
-- Fix discipline_type
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_discipline_type_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_discipline_type_check 
CHECK (discipline_type IN ('accelerazioni', 'partenze', 'allunghi', 'resistenza', 'tecnica', 'mobilità'));

-- Fix category
ALTER TABLE metrics DROP CONSTRAINT IF EXISTS metrics_category_check;
ALTER TABLE metrics ADD CONSTRAINT metrics_category_check 
CHECK (category IN ('gara', 'test', 'massimale'));
```

## Verifica

Dopo aver applicato la migrazione, verifica che i constraint siano corretti:

```sql
-- Verifica i constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid IN ('exercises'::regclass, 'metrics'::regclass)
AND conname LIKE '%check%';
```

Dovresti vedere:
- `exercises_discipline_type_check` con i nuovi valori
- `metrics_category_check` con i nuovi valori

## Test

Dopo la migrazione:

1. Ricarica l'applicazione
2. Prova a creare una nuova sessione di allenamento
3. Compila tutti i campi obbligatori:
   - Data
   - Tipo di sessione
   - Luogo
4. Aggiungi una ripetuta con i risultati
5. Clicca "Salva allenamento"

Il salvataggio dovrebbe andare a buon fine! 🎉

## Miglioramenti Applicati al Codice

Oltre alla fix del database, ho anche migliorato la gestione degli errori nel file `app/registro/page.tsx`:

1. **Messaggi di errore più dettagliati:** Ora l'applicazione mostra esattamente quali sezioni hanno campi mancanti
2. **Scroll automatico:** Quando ci sono errori, la pagina scrolla automaticamente alla prima sezione problematica
3. **Logging migliorato:** Gli errori del database vengono loggati con più dettagli per facilitare il debug

## Note

- ⚠️ **Importante:** Questa migrazione deve essere eseguita PRIMA di provare a salvare nuovi allenamenti
- 📝 Il file `DATABASE.txt` è stato aggiornato con lo schema corretto per riferimento futuro
- 🔄 Se hai già dati nel database con i vecchi valori, considera di aggiornare anche quelli
