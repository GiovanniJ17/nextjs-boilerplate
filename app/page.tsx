import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center h-screen space-y-4">
      <h1 className="text-3xl font-bold">Piattaforma Sessioni</h1>
      <Link
        href="/inserimento"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Vai a Inserimento Sessione
      </Link>
    </main>
  )
}
