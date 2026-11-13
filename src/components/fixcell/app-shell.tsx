import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, LayoutDashboard, LogOut, UserCog, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meuPerfilQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { PerfilDialog } from "./perfil-dialog";

const NAV = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/ordens", label: "Ordens de serviço", icon: ClipboardList },
  { to: "/clientes", label: "Clientes", icon: Users },
] as const;

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";
}

export function AppShell({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: perfil } = useQuery(meuPerfilQuery);
  const [perfilOpen, setPerfilOpen] = useState(false);

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nome = perfil?.nome || perfil?.email || "";

  return (
    <div className="min-h-screen bg-background md:pl-64">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="px-5 py-6">
          <Logo />
          <p className="mt-1.5 pl-[46px] text-[11px] font-medium uppercase tracking-[0.14em] text-sidebar-muted">
            Assistência técnica
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent !text-sidebar-accent-foreground" }}
            >
              <item.icon className="h-4 w-4 group-data-[status=active]:text-sidebar-primary" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => setPerfilOpen(true)}
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-accent"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
              {iniciais(nome)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{nome || "Carregando..."}</span>
              <span className="block truncate text-xs text-sidebar-muted">{perfil?.cargo || "Definir cargo"}</span>
            </span>
            <UserCog className="h-4 w-4 text-sidebar-muted" />
          </button>
          <button
            onClick={sair}
            className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="sticky top-0 z-30 bg-sidebar text-sidebar-foreground md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
          <div className="flex items-center gap-1">
            <button onClick={() => setPerfilOpen(true)} className="rounded-md p-2 text-sidebar-muted hover:bg-sidebar-accent" aria-label="Meu perfil">
              <UserCog className="h-5 w-5" />
            </button>
            <button onClick={sair} className="rounded-md p-2 text-sidebar-muted hover:bg-sidebar-accent" aria-label="Sair">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-sidebar-muted",
              )}
              activeProps={{ className: "bg-sidebar-accent !text-sidebar-accent-foreground" }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10 lg:px-10">{children}</main>

      <PerfilDialog open={perfilOpen} onOpenChange={setPerfilOpen} perfil={perfil ?? null} />
    </div>
  );
}
