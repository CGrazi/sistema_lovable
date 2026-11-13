import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PerfilDialog({
  open,
  onOpenChange,
  perfil,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  perfil: { id: string; nome: string; cargo: string } | null;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");

  useEffect(() => {
    if (open && perfil) {
      setNome(perfil.nome);
      setCargo(perfil.cargo);
    }
  }, [open, perfil]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!perfil) return;
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: perfil.id, nome: nome.trim().slice(0, 120), cargo: cargo.trim().slice(0, 60) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["perfil"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Não foi possível salvar o perfil."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Meu perfil</DialogTitle>
          <DialogDescription>Como você aparece para a equipe.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nome.trim()) return void toast.error("Informe seu nome");
            mutation.mutate();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="p-nome">Nome</Label>
            <Input id="p-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-cargo">Cargo</Label>
            <Input id="p-cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex.: Técnico, Atendente" maxLength={60} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
