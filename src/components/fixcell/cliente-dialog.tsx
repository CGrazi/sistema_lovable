import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Cliente } from "@/lib/os";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const schema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(120),
  telefone: z.string().trim().max(30),
  email: z.union([z.literal(""), z.string().trim().email("E-mail inválido").max(255)]),
  cpf: z.string().trim().max(20),
  endereco: z.string().trim().max(255),
  observacoes: z.string().trim().max(1000),
});
type FormData = z.infer<typeof schema>;
const empty: FormData = { nome: "", telefone: "", email: "", cpf: "", endereco: "", observacoes: "" };

export function ClienteDialog({
  open,
  onOpenChange,
  cliente,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: Cliente | null;
  onSaved?: (cliente: Cliente) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (open) {
      setErrors({});
      setForm(
        cliente
          ? {
              nome: cliente.nome,
              telefone: cliente.telefone,
              email: cliente.email,
              cpf: cliente.cpf,
              endereco: cliente.endereco,
              observacoes: cliente.observacoes,
            }
          : empty,
      );
    }
  }, [open, cliente]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (cliente) {
        const { data: row, error } = await supabase
          .from("clientes")
          .update(data)
          .eq("id", cliente.id)
          .select()
          .single();
        if (error) throw error;
        return row;
      }
      const { data: row, error } = await supabase.from("clientes").insert(data).select().single();
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      toast.success(cliente ? "Cliente atualizado" : "Cliente cadastrado");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["ordens"] });
      onSaved?.(row);
      onOpenChange(false);
    },
    onError: () => toast.error("Não foi possível salvar o cliente."),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof FormData, string>> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as keyof FormData] = issue.message;
      setErrors(errs);
      return;
    }
    mutation.mutate(parsed.data);
  }

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>Dados de contato para avisar quando o aparelho ficar pronto.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="c-nome">Nome completo *</Label>
            <Input id="c-nome" value={form.nome} onChange={set("nome")} maxLength={120} autoFocus />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="c-tel">Telefone / WhatsApp</Label>
              <Input id="c-tel" value={form.telefone} onChange={set("telefone")} placeholder="(11) 99999-0000" maxLength={30} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-cpf">CPF</Label>
              <Input id="c-cpf" value={form.cpf} onChange={set("cpf")} placeholder="000.000.000-00" maxLength={20} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-email">E-mail</Label>
            <Input id="c-email" type="email" value={form.email} onChange={set("email")} maxLength={255} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-end">Endereço</Label>
            <Input id="c-end" value={form.endereco} onChange={set("endereco")} maxLength={255} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-obs">Observações</Label>
            <Textarea id="c-obs" value={form.observacoes} onChange={set("observacoes")} rows={2} maxLength={1000} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
