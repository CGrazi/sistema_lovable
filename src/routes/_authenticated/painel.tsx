import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, CircleDollarSign, PackageCheck, Plus, Users, Wrench } from "lucide-react";
import { clientesQuery, meuPerfilQuery, ordensQuery } from "@/lib/queries";
import { STATUS_LIST, formatBRL, formatNumeroOS, isAberta } from "@/lib/os";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/fixcell/page-header";
import { StatusBadge } from "@/components/fixcell/status-badge";
import { OrdemDialog } from "@/components/fixcell/ordem-dialog";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — FixCell" },
      { name: "description", content: "Resumo das ordens de serviço e clientes da FixCell." },
      { property: "og:title", content: "Painel — FixCell" },
      { property: "og:description", content: "Resumo das ordens de serviço e clientes da FixCell." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(ordensQuery),
      context.queryClient.ensureQueryData(clientesQuery),
      context.queryClient.ensureQueryData(meuPerfilQuery),
    ]),
  component: Painel,
});

function Painel() {
  const { data: ordens } = useSuspenseQuery(ordensQuery);
  const { data: clientes } = useSuspenseQuery(clientesQuery);
  const { data: perfil } = useSuspenseQuery(meuPerfilQuery);
  const [nova, setNova] = useState(false);

  const abertas = ordens.filter((o) => isAberta(o.status));
  const prontas = ordens.filter((o) => o.status === "pronto");
  const agora = new Date();
  const faturadoMes = ordens
    .filter((o) => {
      const d = new Date(o.updated_at);
      return o.status === "entregue" && d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
    })
    .reduce((acc, o) => acc + Number(o.valor), 0);

  const stats = [
    { label: "Ordens em aberto", value: String(abertas.length), icon: Wrench, hint: "Em andamento na bancada" },
    { label: "Prontas p/ retirada", value: String(prontas.length), icon: PackageCheck, hint: "Avise o cliente" },
    { label: "Faturado no mês", value: formatBRL(faturadoMes), icon: CircleDollarSign, hint: "Ordens entregues" },
    { label: "Clientes", value: String(clientes.length), icon: Users, hint: "Cadastrados" },
  ];

  const primeiroNome = perfil?.nome?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={primeiroNome ? `Olá, ${primeiroNome}` : "Painel"}
        description={format(agora, "EEEE, d 'de' MMMM", { locale: ptBR })}
        actions={
          <Button onClick={() => setNova(true)}>
            <Plus /> Nova ordem
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={
              i === 0
                ? "rounded-xl bg-brand-gradient p-5 text-primary-foreground shadow-card"
                : "rounded-xl border bg-card p-5 shadow-card"
            }
          >
            <div className="flex items-center justify-between">
              <span className={i === 0 ? "text-sm font-medium opacity-90" : "text-sm font-medium text-muted-foreground"}>
                {s.label}
              </span>
              <s.icon className={i === 0 ? "h-5 w-5 opacity-80" : "h-5 w-5 text-primary"} />
            </div>
            <div className="mt-3 font-display text-3xl font-semibold tabular">{s.value}</div>
            <div className={i === 0 ? "mt-1 text-xs opacity-80" : "mt-1 text-xs text-muted-foreground"}>{s.hint}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border bg-card shadow-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-base font-semibold">Últimas ordens</h2>
            <Link to="/ordens" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {ordens.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma ordem de serviço ainda.</p>
              <Button className="mt-4" variant="outline" onClick={() => setNova(true)}>
                <Plus /> Abrir a primeira ordem
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {ordens.slice(0, 6).map((o) => (
                <li key={o.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{formatNumeroOS(o.numero)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{o.aparelho}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.clientes?.nome ?? "—"} · {o.defeito}
                    </p>
                  </div>
                  <span className="hidden text-sm font-medium tabular sm:block">{formatBRL(o.valor)}</span>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold">Por status</h2>
          <div className="mt-4 space-y-3">
            {STATUS_LIST.map((s) => {
              const n = ordens.filter((o) => o.status === s.value).length;
              const pct = ordens.length ? (n / ordens.length) * 100 : 0;
              return (
                <div key={s.value}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="tabular text-muted-foreground">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${s.className}`} style={{ width: `${Math.max(pct, n ? 6 : 0)}%`, backgroundColor: "currentColor" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <OrdemDialog open={nova} onOpenChange={setNova} />
    </>
  );
}
