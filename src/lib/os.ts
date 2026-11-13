import type { Database } from "@/integrations/supabase/types";

export type OsStatus = Database["public"]["Enums"]["os_status"];
export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type Ordem = Database["public"]["Tables"]["ordens_servico"]["Row"];
export type OrdemComCliente = Ordem & { clientes: Pick<Cliente, "id" | "nome" | "telefone"> | null };

export const STATUS_LIST: { value: OsStatus; label: string; className: string }[] = [
  { value: "recebido", label: "Recebido", className: "status-recebido" },
  { value: "em_analise", label: "Em análise", className: "status-em_analise" },
  { value: "aguardando_peca", label: "Aguardando peça", className: "status-aguardando_peca" },
  { value: "em_reparo", label: "Em reparo", className: "status-em_reparo" },
  { value: "pronto", label: "Pronto p/ retirada", className: "status-pronto" },
  { value: "entregue", label: "Entregue", className: "status-entregue" },
  { value: "cancelado", label: "Cancelado", className: "status-cancelado" },
];

const FALLBACK_STATUS = { value: "recebido" as OsStatus, label: "Recebido", className: "status-recebido" };
export function statusInfo(status: OsStatus) {
  return STATUS_LIST.find((s) => s.value === status) ?? FALLBACK_STATUS;
}

/** An order is "open" while the shop still has work or a hand-off to do. */
export function isAberta(status: OsStatus) {
  return status !== "entregue" && status !== "cancelado";
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function formatBRL(value: number | string | null | undefined) {
  return brl.format(Number(value ?? 0));
}

/**
 * Parses a Brazilian money input ("1.250,50", "R$ 89,90", "150") into a number.
 * Returns null for empty, invalid or negative values.
 */
export function parseValorBRL(input: string): number | null {
  const cleaned = input.replace(/R\$\s?/i, "").replace(/\s/g, "").trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function formatValorInput(value: number | string) {
  return Number(value).toFixed(2).replace(".", ",");
}

export function formatNumeroOS(numero: number) {
  return `#${String(numero).padStart(4, "0")}`;
}
