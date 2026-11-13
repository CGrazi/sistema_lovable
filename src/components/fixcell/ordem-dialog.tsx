import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clientesQuery } from "@/lib/queries";
import {
  STATUS_LIST,
  formatNumeroOS,
  formatValorInput,
  parseValorBRL,
  type Ordem,
  type OsStatus,
} from "@/lib/os";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClienteDialog } from "./cliente-dialog";

const schema = z.object({
  cliente_id: z.string().uuid("Selecione o cliente"),
  aparelho: z.string().trim().min(1, "Informe o aparelho").max(120),
  imei: z.string().trim().max(30),
  defeito: z.string().trim().min(1, "Descreva o defeito").max(1000),
  valor: z.number({ invalid_type_error: "Valor inválido" }).min(0).max(99999999),
  status: z.enum(STATUS_LIST.map((s) => s.value) as [OsStatus, ...OsStatus[]]),
  observacoes: z.string().trim().max(1000),
});
type Payload = z.infer<typeof schema>;

type FormState = {
  cliente_id: string;
  aparelho: string;
  imei: string;
  defeito: string;
  valor: string;
  status: OsStatus;
  observacoes: string;
};
const empty: FormState = {
  cliente_id: "",
  aparelho: "",
  imei: "",
  defeito: "",
  valor: "",
  status: "recebido",
  observacoes: "",
};

export function OrdemDialog({
  open,
  onOpenChange,
  ordem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem?: Ordem | null;
}) {
  const qc = useQueryClient();
  const { data: clientes = [] } = useQuery(clientesQuery);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [novoCliente, setNovoCliente] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      setForm(
        ordem
          ? {
              cliente_id: ordem.cliente_id,
              aparelho: ordem.aparelho,
              imei: ordem.imei,
              defeito: ordem.defeito,
              valor: formatValorInput(ordem.valor),
              status: ordem.status,
              observacoes: ordem.observacoes,
            }
          : empty,
      );
    }
  }, [open, ordem]);

  const mutation = useMutation({
    mutationFn: async (data: Payload) => {
      if (ordem) {
        const { error } = await supabase.from("ordens_servico").update(data).eq("id", ordem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ordens_servico").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(ordem ? "Ordem atualizada" : "Ordem de serviço aberta");
      qc.invalidateQueries({ queryKey: ["ordens"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Não foi possível salvar a ordem."),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const valor = form.valor.trim() === "" ? 0 : parseValorBRL(form.valor);
    if (valor === null) {
      setErrors({ valor: "Use o formato 150,00" });
      return;
    }
    const parsed = schema.safeParse({ ...form, valor });
    if (!parsed.success) {
      const errs: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as keyof FormState] = issue.message;
      setErrors(errs);
      return;
    }
    mutation.mutate(parsed.data);
  }

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {ordem ? `Editar ordem ${formatNumeroOS(ordem.numero)}` : "Nova ordem de serviço"}
            </DialogTitle>
            <DialogDescription>Registre o aparelho, o defeito relatado e o valor do serviço.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Cliente *</Label>
              <div className="flex gap-2">
                <Select value={form.cliente_id} onValueChange={(v) => setForm((f) => ({ ...f, cliente_id: v }))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={clientes.length ? "Selecione o cliente" : "Nenhum cliente cadastrado"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                        {c.telefone ? ` · ${c.telefone}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setNovoCliente(true)} aria-label="Cadastrar novo cliente">
                  <UserPlus />
                </Button>
              </div>
              {errors.cliente_id && <p className="text-xs text-destructive">{errors.cliente_id}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <div className="grid gap-1.5">
                <Label htmlFor="o-ap">Aparelho *</Label>
                <Input id="o-ap" value={form.aparelho} onChange={set("aparelho")} placeholder="Ex.: iPhone 13 Pro, Galaxy S23" maxLength={120} />
                {errors.aparelho && <p className="text-xs text-destructive">{errors.aparelho}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="o-imei">IMEI / Nº série</Label>
                <Input id="o-imei" value={form.imei} onChange={set("imei")} className="font-mono" maxLength={30} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="o-def">Defeito relatado *</Label>
              <Textarea id="o-def" value={form.defeito} onChange={set("defeito")} rows={3} placeholder="Ex.: tela trincada, não carrega, bateria estufada..." maxLength={1000} />
              {errors.defeito && <p className="text-xs text-destructive">{errors.defeito}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="o-valor">Valor (R$)</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input id="o-valor" value={form.valor} onChange={set("valor")} inputMode="decimal" placeholder="0,00" className="pl-9 tabular" />
                </div>
                {errors.valor && <p className="text-xs text-destructive">{errors.valor}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as OsStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="o-obs">Observações internas</Label>
              <Textarea id="o-obs" value={form.observacoes} onChange={set("observacoes")} rows={2} placeholder="Senha de desbloqueio, acessórios deixados..." maxLength={1000} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : ordem ? "Salvar alterações" : "Abrir ordem"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ClienteDialog
        open={novoCliente}
        onOpenChange={setNovoCliente}
        onSaved={(c) => setForm((f) => ({ ...f, cliente_id: c.id }))}
      />
    </>
  );
}
