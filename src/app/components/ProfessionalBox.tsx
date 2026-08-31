type ProfessionalBoxProps = {
  children: React.ReactNode;
  className?: string;
  showTopLine?: boolean;
  showBottomLine?: boolean;
  showInternalLine?: boolean;
  /** Alinhamento do conteúdo: "center" (padrão) ou deixe o conteúdo controlar com suas próprias classes/styles */
  contentAlign?: "center" | "inherit";
};

export default function ProfessionalBox({
  children,
  className = "",
  showTopLine = true,
  showBottomLine = true,
  showInternalLine = false,
  contentAlign = "center",
}: ProfessionalBoxProps) {
  return (
    <div className={`relative w-full max-w-4xl mx-auto ${className}`}>
      {/* LINHA SUPERIOR COM FADE */}
      {showTopLine && (
        <div
          className="h-[1px]"
          style={{
            background:
              "linear-gradient(to right, transparent 0%, rgba(239, 68, 68, 0.3) 15%, rgba(239, 68, 68, 0.6) 50%, rgba(239, 68, 68, 0.3) 85%, transparent 100%)",
            boxShadow: "0 1px 10px rgba(239, 68, 68, 0.4)",
          }}
        />
      )}

      {/* CONTEÚDO COM FUNDO PRETO */}
      <div
        className="relative"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 8%, rgba(0,0,0,0.85) 20%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.75) 92%, rgba(0,0,0,0) 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* LINHA LATERAL ESQUERDA COM FADE */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-[1px]"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(239, 68, 68, 0.3) 15%, rgba(239, 68, 68, 0.6) 50%, rgba(239, 68, 68, 0.3) 85%, transparent 100%)",
            boxShadow: "-1px 0 10px rgba(239, 68, 68, 0.4)"
          }}
        />

        {showInternalLine && (
          <div
            className="h-[1px] mx-auto mb-5"
            style={{
              width: "55%",
              background:
                "linear-gradient(to right, transparent 0%, rgba(239, 68, 68, 0.4) 25%, rgba(239, 68, 68, 0.7) 50%, rgba(239, 68, 68, 0.4) 75%, transparent 100%)",
              boxShadow: "0 1px 8px rgba(239, 68, 68, 0.3)",
            }}
          />
        )}

        <div className={`px-4 md:px-6 py-4 ${contentAlign === "center" ? "text-center" : ""}`}>{children}</div>

        {/* LINHA LATERAL DIREITA COM FADE */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-[1px]"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(239, 68, 68, 0.3) 15%, rgba(239, 68, 68, 0.6) 50%, rgba(239, 68, 68, 0.3) 85%, transparent 100%)",
            boxShadow: "1px 0 10px rgba(239, 68, 68, 0.4)"
          }}
        />
      </div>

      {/* LINHA INFERIOR COM FADE */}
      {showBottomLine && (
        <div
          className="h-[1px]"
          style={{
            background:
              "linear-gradient(to right, transparent 0%, rgba(239, 68, 68, 0.3) 15%, rgba(239, 68, 68, 0.6) 50%, rgba(239, 68, 68, 0.3) 85%, transparent 100%)",
            boxShadow: "0 1px 10px rgba(239, 68, 68, 0.4)",
          }}
        />
      )}
    </div>
  );
}
