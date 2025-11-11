-- ==========================================
-- Fix per constraint discipline_type e category
-- ==========================================
-- Questo script rimuove i vecchi constraint e ne aggiunge di nuovi
-- con i valori corretti usati dall'applicazione

-- 1. Fix discipline_type in exercises
-- Rimuovi il vecchio constraint (se esiste)
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_discipline_type_check;

-- Aggiungi il nuovo constraint con i valori corretti
ALTER TABLE exercises ADD CONSTRAINT exercises_discipline_type_check 
CHECK (discipline_type IN ('accelerazioni', 'partenze', 'allunghi', 'resistenza', 'tecnica', 'mobilità'));

-- 2. Fix category in metrics
-- Rimuovi il vecchio constraint (se esiste)
ALTER TABLE metrics DROP CONSTRAINT IF EXISTS metrics_category_check;

-- Aggiungi il nuovo constraint con i valori corretti
ALTER TABLE metrics ADD CONSTRAINT metrics_category_check 
CHECK (category IN ('gara', 'test', 'massimale'));

-- Verifica che i constraint siano stati aggiunti correttamente
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid IN ('exercises'::regclass, 'metrics'::regclass)
-- AND conname LIKE '%check%';
