# Configurazione Cloudflare Pages

## Variabili d'Ambiente Richieste

Per far funzionare correttamente l'applicazione su Cloudflare Pages, devi configurare le seguenti variabili d'ambiente:

### 1. Vai su Cloudflare Pages Dashboard
- Apri: https://dash.cloudflare.com/
- Seleziona il tuo progetto `nextjs-boilerplate`
- Vai su **Settings** → **Environment variables**

### 2. Aggiungi le variabili Supabase

Clicca su **Add variable** e aggiungi:

#### Variabile 1:
- **Variable name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: Il tuo URL Supabase (es: `https://xxxxx.supabase.co`)
- **Environment**: Production (seleziona anche Preview se vuoi)

#### Variabile 2:
- **Variable name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: La tua chiave pubblica (anon key) di Supabase
- **Environment**: Production (seleziona anche Preview se vuoi)

### 3. Dove trovare le credenziali Supabase

1. Vai su https://supabase.com/dashboard
2. Seleziona il tuo progetto
3. Vai su **Settings** → **API**
4. Troverai:
   - **Project URL** → usa questo per `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys** → **anon/public** → usa questo per `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Redeploy

Dopo aver aggiunto le variabili d'ambiente:
- Vai su **Deployments**
- Clicca sui tre puntini dell'ultimo deployment
- Seleziona **Retry deployment**

**Oppure** fai un nuovo commit e push su GitHub (trigger automatico del deploy).

---

## Verifica Configurazione

Una volta configurato, queste funzionalità funzioneranno:
- ✅ Export Excel
- ✅ Backup JSON
- ✅ Restore dati
- ✅ Tutte le funzionalità del tracker

Se vedi ancora errori tipo "Supabase non configurato", verifica che:
1. Le variabili siano state salvate correttamente
2. Hai fatto il redeploy dopo averle aggiunte
3. I nomi delle variabili siano esattamente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
