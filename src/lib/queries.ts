import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OrdemComCliente } from "./os";

export const clientesQuery = queryOptions({
  queryKey: ["clientes"],
  queryFn: async () => {
    const { data, error } = await supabase.from("clientes").select("*").order("nome");
    if (error) throw error;
    return data;
  },
});

export const ordensQuery = queryOptions({
  queryKey: ["ordens"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("ordens_servico")
      .select("*, clientes(id, nome, telefone)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as OrdemComCliente[];
  },
});

export const meuPerfilQuery = queryOptions({
  queryKey: ["perfil"],
  queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    return { ...(data ?? { id: auth.user.id, nome: "", cargo: "" }), email: auth.user.email ?? "" };
  },
});
