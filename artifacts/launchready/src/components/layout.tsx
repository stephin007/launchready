import { ReactNode } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { Zap, LogOut, ChevronDown } from "lucide-react";
import { useUser, useClerk, Show } from "@clerk/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  if (!user) return null;

  const displayName = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? "User";
  const initials = (user.firstName?.[0] ?? user.emailAddresses[0]?.emailAddress?.[0] ?? "U").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[rgba(255,255,255,0.05)] transition-colors text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            {initials}
          </div>
          <span className="hidden sm:block max-w-[120px] truncate" style={{ color: "var(--text-secondary)" }}>
            {displayName}
          </span>
          <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[160px] bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)]"
      >
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{displayName}</p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {user.emailAddresses[0]?.emailAddress}
          </p>
        </div>
        <DropdownMenuSeparator className="bg-[var(--border-subtle)]" />
        <DropdownMenuItem
          className="gap-2 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] focus:bg-[rgba(255,255,255,0.05)]"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => signOut(() => setLocation("/"))}
        >
          <LogOut size={14} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Layout({ children, isShared = false }: { children: ReactNode; isShared?: boolean }) {
  const [isAdmin] = useRoute("/admin");
  const [isGenerate] = useRoute("/generate");
  const { user, isLoaded } = useUser();
  const isAdminUser = isLoaded && (user?.publicMetadata as Record<string, unknown>)?.role === "admin";

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-[var(--bg-panel)] border-b border-[var(--border-subtle)]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
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
            <div className="flex items-center gap-4">
              <Show when="signed-in">
                <nav className="flex items-center gap-5 text-sm font-medium">
                  <Link href="/generate" className={`transition-colors ${isGenerate ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                    Generate
                  </Link>
                  {isAdminUser && (
                    <Link href="/admin" className={`transition-colors ${isAdmin ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                      Dashboard
                    </Link>
                  )}
                </nav>
                <UserMenu />
              </Show>
              <Show when="signed-out">
                <nav className="flex items-center gap-3 text-sm">
                  <Link
                    href="/sign-in"
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors font-medium"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="px-3 py-1.5 rounded-md font-medium text-white transition-colors hover:opacity-90"
                    style={{ background: "var(--accent)" }}
                  >
                    Get started
                  </Link>
                </nav>
              </Show>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
