# Migrazione Exercise Blocks - Guida

## 📋 Cosa fa questa migrazione

Questa migrazione introduce una struttura gerarchica per gli allenamenti che meglio rispecchia la realtà:

**Prima:**
```
Session -> Exercise -> Results
```

**Dopo:**
```
Session -> Exercise Block -> Exercise -> Results
```

### Vantaggi della nuova struttura:

1. **Blocchi sequenziali**: Puoi raggruppare esercizi in blocchi (es. "Riscaldamento", "Parte principale", "Defaticamento")
2. **Recuperi tra blocchi**: Ogni blocco può avere un recupero dopo di esso
3. **Ordine preciso**: Gli esercizi mantengono l'ordine esatto dell'allenamento
4. **Più flessibilità**: Supporta allenamenti complessi come:
   - `3x80m (rec 2min) -> REC 3min -> 3x60m (rec 2min) -> REC 3min -> 1x200m`

## 🚀 Come applicare la migrazione

### Opzione 1: Supabase Dashboard (Consigliato)

1. Apri [Supabase Dashboard](https://app.supabase.com)
2. Seleziona il tuo progetto
3. Vai su **SQL Editor**
4. **IMPORTANTE**: Inizia con una transazione:
   ```sql
   BEGIN;
   ```
5. Copia e incolla il contenuto di `migration_add_exercise_blocks.sql`
6. Clicca **Run**
7. **Verifica i risultati** usando le query di verifica in fondo allo script
8. Se tutto è ok, fai commit:
   ```sql
   COMMIT;
   ```
9. Se qualcosa è andato storto:
   ```sql
   ROLLBACK;
   ```

### Opzione 2: CLI

```bash
# Backup del database (IMPORTANTE!)
supabase db dump -f backup_before_blocks.sql

# Applica la migrazione
psql $DATABASE_URL -f migration_add_exercise_blocks.sql
```

## ✅ Verifica Post-Migrazione

Dopo aver applicato la migrazione, esegui queste query per verificare:

### 1. Tutti gli esercizi hanno un block_id
```sql
SELECT COUNT(*) as exercises_without_block 
FROM exercises 
WHERE block_id IS NULL;
```
**Risultato atteso:** 0

### 2. Visualizza la struttura completa
```sql
SELECT 
  ts.date,
  ts.type,
  eb.block_number,
  eb.name as block_name,
  e.exercise_number,
  e.name as exercise_name,
  e.distance_m,
  e.sets,
  e.repetitions
FROM training_sessions ts
JOIN exercise_blocks eb ON eb.session_id = ts.id
JOIN exercises e ON e.block_id = eb.id
ORDER BY ts.date DESC, eb.block_number, e.exercise_number
LIMIT 20;
```

### 3. Conta elementi
```sql
SELECT 
  (SELECT COUNT(*) FROM training_sessions) as total_sessions,
  (SELECT COUNT(*) FROM exercise_blocks) as total_blocks,
  (SELECT COUNT(*) FROM exercises) as total_exercises,
  (SELECT COUNT(*) FROM exercise_results) as total_results;
```

## 📝 Cosa succede ai dati esistenti?

- **Training Sessions**: Rimangono invariate
- **Exercises**: Vengono tutti assegnati a un blocco di default chiamato "Blocco principale"
- **Exercise Results**: Rimangono invariati, solo `attempt_number` viene rinominato in `set_number`
- **Metrics**: Rimangono invariate

## 🔄 Nuova struttura dati

### Esempio: Allenamento del lunedì (test)

```
Session: "Test 150m e 60m" (2024-11-11)
  └─ Block 1: "Test massimali"
      ├─ Exercise 1: "150m" (1 set, 1 rep, intensità 10)
      │   └─ Result: 17.85s
      └─ Exercise 2: "60m" (1 set, 1 rep, intensità 10)
          └─ Result: 7.12s
      Rest after block: 420s (7 min)
```

### Esempio: Allenamento complesso di venerdì

```
Session: "Lavoro settimanale" (2024-11-15)
  ├─ Block 1: "Serie 100m"
  │   └─ Exercise 1: "100m" (3 sets, 4 reps)
  │       Rest between reps: 30s
  │       Rest between sets: 180s (3 min)
  │       Results: 12.1s, 12.3s, 12.2s, 12.4s (serie 1)...
  │   Rest after block: 240s (4 min)
  │
  └─ Block 2: "Finale"
      └─ Exercise 1: "150m" (1 set, 1 rep, intensità 9)
          └─ Result: 18.2s
```

## ⚠️ Importante

- **Fai sempre un backup** prima di eseguire la migrazione
- **Testa in ambiente di sviluppo** se possibile
- **Usa transazioni** (BEGIN/COMMIT/ROLLBACK) per poter annullare in caso di problemi
- Dopo la migrazione, **aggiorna il codice dell'applicazione** per usare la nuova struttura

## 🔧 Prossimi passi

Dopo aver applicato la migrazione al database:

1. ✅ Aggiornare lo schema in `DATABASE.txt` (già fatto)
2. ⏳ Modificare la pagina di registro per supportare i blocchi
3. ⏳ Aggiornare le query della pagina statistiche
4. ⏳ Testare inserimento e visualizzazione

## 🆘 Problemi?

Se incontri errori durante la migrazione:

1. **Non fare panic!** Usa `ROLLBACK;` per annullare tutto
2. Controlla i messaggi di errore nel SQL Editor
3. Verifica che non ci siano vincoli di foreign key non soddisfatti
4. Assicurati di avere i permessi necessari sul database

---

**Data creazione**: 2025-11-11
**Versione**: 1.0
