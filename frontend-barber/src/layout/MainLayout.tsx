import type { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-zinc-900 border-b border-zinc-800 p-4">
        <h1 className="text-xl font-bold">Barber Shop</h1>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-zinc-900 border-t border-zinc-800 p-4 text-center text-zinc-400">
        <p>© 2024 Barber Shop</p>
      </footer>
    </div>
  );
}