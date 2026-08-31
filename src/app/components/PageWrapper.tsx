type PageWrapperProps = {
  children: React.ReactNode;
};

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <main className="min-h-screen bg-[#606060] px-6 py-12">
      {children}
    </main>
  );
}
