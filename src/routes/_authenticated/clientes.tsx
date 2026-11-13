import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, MoreHorizontal, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clientesQuery, ordensQuery } from "@/lib/queries";
import { isAberta, type Cliente } from "@/lib/os";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ClienteDialog } from "@/components/fixcell/cliente-dialog";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — FixCell" },
      { name: "description", content: "Cadastro de clientes da assistência técnica FixCell." },
      { property: "og:title", content: "Clientes — FixCell" },
      { property: "og:description", content: "Cadastro de clientes da assistência técnica FixCell." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(clientesQuery),
      context.queryClient.ensureQueryData(ordensQuery),
    ]),
  component: ClientesPage,
});

function ClientesPage() {
  const qc = useQueryClient();
  const { data: clientes } = useSuspenseQuery(clientesQuery);
  const { data: ordens } = useSuspenseQuery(ordensQuery);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [excluir, setExcluir] = useState<Cliente | null>(null);

  const contagem = useMemo(() => {
    const map = new Map<string, { total: number; abertas: number }>();
    for (const o of ordens) {
      const c = map.get(o.cliente_id) ?? { total: 0, abertas: 0 };
      c.total++;
      if (isAberta(o.status)) c.abertas++;
      map.set(o.cliente_id, c);
    }
    return map;
  }, [ordens]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      [c.nome, c.telefone, c.email, c.cpf].some((v) => v.toLowerCase().includes(q)),
    );
  }, [clientes, busca]);

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente excluído");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      setExcluir(null);
    },
    onError: (err: { code?: string }) => {
      toast.error(
        err?.code === "23503"
          ? "Este cliente tem ordens de serviço. Exclua as ordens antes."
          : "Não foi possível excluir o cliente.",
      );
      setExcluir(null);
    },
  });

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${clientes.length} ${clientes.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}`}
        actions={
          <Button
            onClick={() => {
              setEditando(null);
              setDialogOpen(true);
            }}
          >
            <Plus /> Novo cliente
          </Button>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, telefone, e-mail ou CPF..." className="bg-card pl-9" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Nome</th>
                <th className="px-4 py-3 font-semibold">Contato</th>
                <th className="px-4 py-3 font-semibold">CPF</th>
                <th className="px-4 py-3 font-semibold">Ordens</th>
                <th className="w-10 px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map((c) => {
                const n = contagem.get(c.id);
                return (
                  <tr key={c.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                          {c.nome.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <div className="font-medium">{c.nome}</div>
                          {c.endereco && <div className="text-xs text-muted-foreground">{c.endereco}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.telefone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" /> {c.telefone}
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Mail className="h-3.5 w-3.5" /> {c.email}
                        </div>
                      )}
                      {!c.telefone && !c.email && "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.cpf || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold tabular">{n?.total ?? 0}</span>
                      {n?.abertas ? (
                        <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                          {n.abertas} em aberto
                        </span>
                      ) : null}
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
                              setEditando(c);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setExcluir(c)}>
                            <Trash2 /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    {clientes.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClienteDialog open={dialogOpen} onOpenChange={setDialogOpen} cliente={editando} />

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {excluir?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>Clientes com ordens de serviço não podem ser excluídos.</AlertDialogDescription>
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
