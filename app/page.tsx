export default function Home() {
  return (
    <main
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "sans-serif",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <h1 style={{ fontSize: "2rem" }}>🚀 Next.js su Cloudflare Pages</h1>
      <p>Il deploy è avvenuto con successo!</p>
      <a
        href="https://github.com/GiovanniJ17/nextjs-boilerplate"
        style={{ color: "#0070f3", textDecoration: "none" }}
      >
        Vai al repository →
      </a>
    </main>
  );
}
