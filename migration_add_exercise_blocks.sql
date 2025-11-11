-- ==========================================
-- MIGRAZIONE: Aggiunta Exercise Blocks
-- ==========================================
-- Questa migrazione introduce una struttura gerarchica per gli allenamenti:
-- Session -> Exercise Block -> Exercise -> Results
--
-- IMPORTANTE: Esegui questo script in una transazione per poter fare rollback in caso di problemi
-- BEGIN;
-- [esegui lo script]
-- COMMIT; (o ROLLBACK; se ci sono problemi)

-- ==========================================
-- STEP 1: Crea la nuova tabella exercise_blocks
-- ==========================================

CREATE TABLE IF NOT EXISTS exercise_blocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid REFERENCES training_sessions(id) ON DELETE CASCADE,
  block_number int NOT NULL,
  name text,
  rest_after_block_s int,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_blocks_session ON exercise_blocks(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_blocks_order ON exercise_blocks(session_id, block_number);

-- ==========================================
-- STEP 2: Aggiungi colonne temporanee alla tabella exercises
-- ==========================================

-- Aggiungi block_id (nullable per ora)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS block_id uuid REFERENCES exercise_blocks(id) ON DELETE CASCADE;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS exercise_number int;

-- ==========================================
-- STEP 3: Migra i dati esistenti
-- ==========================================

-- Per ogni sessione esistente, crea un blocco di default e assegna tutti gli esercizi
DO $$
DECLARE
  session_record RECORD;
  exercise_record RECORD;
  new_block_id uuid;
  exercise_order int;
BEGIN
  -- Per ogni sessione
  FOR session_record IN SELECT DISTINCT session_id FROM exercises WHERE session_id IS NOT NULL
  LOOP
    -- Crea un blocco di default per questa sessione
    INSERT INTO exercise_blocks (session_id, block_number, name, rest_after_block_s)
    VALUES (session_record.session_id, 1, 'Blocco principale', NULL)
    RETURNING id INTO new_block_id;
    
    -- Assegna tutti gli esercizi di questa sessione al nuovo blocco
    exercise_order := 1;
    FOR exercise_record IN 
      SELECT id FROM exercises 
      WHERE session_id = session_record.session_id 
      ORDER BY created_at
    LOOP
      UPDATE exercises 
      SET block_id = new_block_id, exercise_number = exercise_order
      WHERE id = exercise_record.id;
      
      exercise_order := exercise_order + 1;
    END LOOP;
  END LOOP;
END $$;

-- ==========================================
-- STEP 4: Rimuovi la vecchia colonna session_id e rendi obbligatori i nuovi campi
-- ==========================================

-- Rimuovi session_id da exercises (ora usiamo block_id)
ALTER TABLE exercises DROP COLUMN IF EXISTS session_id;

-- Rimuovi rest_after_exercise_s (ora è rest_after_block_s)
ALTER TABLE exercises DROP COLUMN IF EXISTS rest_after_exercise_s;

-- Rendi block_id e exercise_number NOT NULL
ALTER TABLE exercises ALTER COLUMN block_id SET NOT NULL;
ALTER TABLE exercises ALTER COLUMN exercise_number SET NOT NULL;

-- ==========================================
-- STEP 5: Rinomina attempt_number -> set_number in exercise_results
-- ==========================================

ALTER TABLE exercise_results RENAME COLUMN attempt_number TO set_number;

-- Crea indice per ottimizzare le query
CREATE INDEX IF NOT EXISTS idx_results_order ON exercise_results(exercise_id, set_number, repetition_number);

-- ==========================================
-- STEP 6: Aggiorna gli indici
-- ==========================================

-- Rimuovi vecchi indici se esistono
DROP INDEX IF EXISTS idx_exercises_session;

-- Crea nuovi indici
CREATE INDEX IF NOT EXISTS idx_exercises_block ON exercises(block_id);
CREATE INDEX IF NOT EXISTS idx_exercises_order ON exercises(block_id, exercise_number);

-- ==========================================
-- VERIFICA
-- ==========================================

-- Esegui queste query per verificare che la migrazione sia andata a buon fine:

-- 1. Verifica che tutti gli esercizi abbiano un block_id
-- SELECT COUNT(*) as exercises_without_block FROM exercises WHERE block_id IS NULL;
-- (dovrebbe essere 0)

-- 2. Verifica la struttura completa
-- SELECT 
--   ts.date,
--   ts.type,
--   eb.block_number,
--   eb.name as block_name,
--   e.exercise_number,
--   e.name as exercise_name,
--   e.distance_m,
--   e.sets,
--   e.repetitions
-- FROM training_sessions ts
-- JOIN exercise_blocks eb ON eb.session_id = ts.id
-- JOIN exercises e ON e.block_id = eb.id
-- ORDER BY ts.date DESC, eb.block_number, e.exercise_number
-- LIMIT 20;

-- 3. Conta gli elementi
-- SELECT 
--   (SELECT COUNT(*) FROM training_sessions) as total_sessions,
--   (SELECT COUNT(*) FROM exercise_blocks) as total_blocks,
--   (SELECT COUNT(*) FROM exercises) as total_exercises,
--   (SELECT COUNT(*) FROM exercise_results) as total_results;

-- ==========================================
-- ROLLBACK (se necessario)
-- ==========================================
-- Se qualcosa va storto, puoi fare rollback con:
-- ROLLBACK;

-- ==========================================
-- COMMIT (quando sei sicuro)
-- ==========================================
-- Quando tutto è verificato, fai commit con:
-- COMMIT;
