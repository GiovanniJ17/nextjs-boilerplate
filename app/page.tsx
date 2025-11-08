export default function HomePage() {
  return (
    <main style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'sans-serif',
      background: '#f5f5f5'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏃‍♂️ Speed Tracker</h1>
      <p style={{ fontSize: '1.2rem', color: '#333' }}>
        Benvenuto nella tua piattaforma personale di allenamento!
      </p>
      <p style={{ marginTop: '1rem', color: '#777' }}>
        (Next.js + Cloudflare + Supabase setup pronto 🚀)
      </p>
    </main>
  );
}
