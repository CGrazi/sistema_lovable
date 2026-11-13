import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clientesQuery, ordensQuery } from "@/lib/queries";
import { STATUS_LIST, formatBRL, formatNumeroOS, statusInfo, type Ordem, type OsStatus } from "@/lib/os";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/fixcell/page-header";
import { StatusBadge } from "@/components/fixcell/status-badge";
import { OrdemDialog } from "@/components/fixcell/ordem-dialog";

export const Route = createFileRoute("/_authenticated/ordens")({
  head: () => ({
    meta: [
      { title: "Ordens de serviço — FixCell" },
      { name: "description", content: "Cadastro e acompanhamento das ordens de serviço da FixCell." },
      { property: "og:title", content: "Ordens de serviço — FixCell" },
      { property: "og:description", content: "Cadastro e acompanhamento das ordens de serviço da FixCell." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(ordensQuery),
      context.queryClient.ensureQueryData(clientesQuery),
    ]),
  component: OrdensPage,
});

function OrdensPage() {
  const qc = useQueryClient();
  const { data: ordens } = useSuspenseQuery(ordensQuery);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<OsStatus | "todas">("todas");
  const [editando, setEditando] = useState<Ordem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [excluir, setExcluir] = useState<Ordem | null>(null);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return ordens.filter((o) => {
      if (filtro !== "todas" && o.status !== filtro) return false;
      if (!q) return true;
      return [o.aparelho, o.defeito, o.imei, o.clientes?.nome, formatNumeroOS(o.numero)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [ordens, busca, filtro]);

  const mudarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OsStatus }) => {
      const { error } = await supabase.from("ordens_servico").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Status alterado para "${statusInfo(v.status).label}"`);
      qc.invalidateQueries({ queryKey: ["ordens"] });
    },
    onError: () => toast.error("Não foi possível alterar o status."),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ordens_servico").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ordem excluída");
      qc.invalidateQueries({ queryKey: ["ordens"] });
      setExcluir(null);
    },
    onError: () => toast.error("Não foi possível excluir."),
  });

  return (
    <>
      <PageHeader
        title="Ordens de serviço"
        description={`${ordens.length} ${ordens.length === 1 ? "ordem registrada" : "ordens registradas"}`}
        actions={
          <Button
            onClick={() => {
              setEditando(null);
              setDialogOpen(true);
            }}
          >
            <Plus /> Nova ordem
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nº, cliente, aparelho, IMEI..." className="bg-card pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[{ value: "todas" as const, label: "Todas" }, ...STATUS_LIST].map((s) => {
            const count = s.value === "todas" ? ordens.length : ordens.filter((o) => o.status === s.value).length;
            const active = filtro === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setFiltro(s.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  active ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label} <span className="ml-1 tabular opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Nº</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Aparelho</th>
                <th className="px-4 py-3 font-semibold">Defeito</th>
                <th className="px-4 py-3 text-right font-semibold">Valor</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Entrada</th>
                <th className="w-10 px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtradas.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatNumeroOS(o.numero)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.clientes?.nome ?? "—"}</div>
                    {o.clientes?.telefone && <div className="text-xs text-muted-foreground">{o.clientes.telefone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.aparelho}</div>
                    {o.imei && <div className="font-mono text-xs text-muted-foreground">{o.imei}</div>}
                  </td>
                  <td className="max-w-[240px] px-4 py-3 text-muted-foreground">
                    <span className="line-clamp-2">{o.defeito}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular">{formatBRL(o.valor)}</td>
                  <td className="px-4 py-3">
                    <Select value={o.status} onValueChange={(v) => mudarStatus.mutate({ id: o.id, status: v as OsStatus })}>
                      <SelectTrigger className="h-auto w-auto gap-1 border-0 bg-transparent p-0 shadow-none focus:ring-0" aria-label="Alterar status">
                        <StatusBadge status={o.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_LIST.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {format(new Date(o.created_at), "dd/MM/yyyy")}
                  </td>
                  <td className="px-2 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Ações">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditando(o);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setExcluir(o)}>
                          <Trash2 /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    {ordens.length === 0 ? "Nenhuma ordem de serviço cadastrada ainda." : "Nenhuma ordem encontrada com esse filtro."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrdemDialog open={dialogOpen} onOpenChange={setDialogOpen} ordem={editando} />

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ordem {excluir ? formatNumeroOS(excluir.numero) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => excluir && remover.mutate(excluir.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
