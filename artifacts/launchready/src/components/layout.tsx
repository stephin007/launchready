import { ReactNode } from "react";
import { Link, useRoute } from "wouter";
import { Zap } from "lucide-react";

export function Layout({ children, isShared = false }: { children: ReactNode; isShared?: boolean }) {
  const [isAdmin] = useRoute("/admin");
  const [isHome] = useRoute("/");

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-[var(--bg-panel)] border-b border-[var(--border-subtle)]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              {/* Glow layer */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: "-4px",
                  borderRadius: "10px",
                  background: "radial-gradient(ellipse at center, rgba(113,112,255,0.45) 0%, rgba(94,106,210,0.15) 55%, transparent 80%)",
                  filter: "blur(6px)",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
              <div className="relative z-10 w-8 h-8 rounded bg-[var(--accent)] flex items-center justify-center text-white group-hover:bg-[var(--accent-hover)] transition-colors shadow-[rgba(0,0,0,0.4)_0px_2px_4px]">
                <Zap size={18} />
              </div>
            </div>
            <span className="font-medium text-[var(--text-primary)] tracking-tight">LaunchReady</span>
            {isShared && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                View only
              </span>
            )}
          </Link>

          {!isShared && (
            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link href="/" className={`transition-colors ${isHome ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                Generate
              </Link>
              <Link href="/admin" className={`transition-colors ${isAdmin ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                Dashboard
              </Link>
            </nav>
          )}
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}