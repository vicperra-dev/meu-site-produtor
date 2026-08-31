type SectionBoxProps = {
  children: React.ReactNode;
  className?: string;
};

export default function SectionBox({ children, className = "" }: SectionBoxProps) {
  return (
    <section
      className={`
        rounded-xl
        bg-zinc-900/90
        border border-zinc-800
        shadow-[0_12px_40px_rgba(0,0,0,0.4)]
        p-4 md:p-6
        ${className}
      `}
    >
      {children}
    </section>
  );
}
