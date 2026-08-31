export default function Loading() {
  return (
    <main className="relative flex min-h-screen min-w-0 items-center justify-center overflow-hidden px-6 py-12 text-zinc-100">
      {/* Mesmo fundo da página de login */}
      <div
        className="fixed inset-0 z-0 bg-zinc-900 bg-no-repeat"
        style={{
          backgroundImage: "url(/login-bg.png.png)",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          minWidth: "100%",
          minHeight: "100%",
        }}
        aria-hidden
      />
      <div className="relative z-10 text-center">
        <p className="text-zinc-400">Carregando...</p>
      </div>
    </main>
  );
}
