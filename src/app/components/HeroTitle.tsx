type HeroTitleProps = {
  children: React.ReactNode;
};

export default function HeroTitle({ children }: HeroTitleProps) {
  return (
    <div className="inline-block rounded-xl bg-black/90 px-6 py-4 shadow-lg">
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-100">
        {children}
      </h1>
    </div>
  );
}
