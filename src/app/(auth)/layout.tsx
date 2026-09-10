export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="text-2xl font-semibold">
            Q-Not
          </a>
          <p className="mt-1 text-sm text-neutral-400">
            Transit intelligence for Nigerian bus terminals
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
