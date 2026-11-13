-- Perfis da equipe
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  cargo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe vê perfis" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuário cria o próprio perfil" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuário edita o próprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Criação automática de perfil no cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, cargo)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome', ''), NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), ''),
    COALESCE(NEW.raw_user_meta_data->>'cargo', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 120),
  telefone TEXT NOT NULL DEFAULT '' CHECK (char_length(telefone) <= 30),
  email TEXT NOT NULL DEFAULT '' CHECK (char_length(email) <= 255),
  cpf TEXT NOT NULL DEFAULT '' CHECK (char_length(cpf) <= 20),
  endereco TEXT NOT NULL DEFAULT '' CHECK (char_length(endereco) <= 255),
  observacoes TEXT NOT NULL DEFAULT '' CHECK (char_length(observacoes) <= 1000),
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe vê clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Equipe cria clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Equipe edita clientes" ON public.clientes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Equipe exclui clientes" ON public.clientes FOR DELETE TO authenticated USING (true);
CREATE TRIGGER clientes_updated_at BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ordens de serviço
CREATE TYPE public.os_status AS ENUM ('recebido', 'em_analise', 'aguardando_peca', 'em_reparo', 'pronto', 'entregue', 'cancelado');

CREATE TABLE public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  aparelho TEXT NOT NULL CHECK (char_length(aparelho) BETWEEN 1 AND 120),
  imei TEXT NOT NULL DEFAULT '' CHECK (char_length(imei) <= 30),
  defeito TEXT NOT NULL CHECK (char_length(defeito) BETWEEN 1 AND 1000),
  valor NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  status public.os_status NOT NULL DEFAULT 'recebido',
  observacoes TEXT NOT NULL DEFAULT '' CHECK (char_length(observacoes) <= 1000),
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ordens_servico_cliente_idx ON public.ordens_servico(cliente_id);
CREATE INDEX ordens_servico_status_idx ON public.ordens_servico(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe vê ordens" ON public.ordens_servico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Equipe cria ordens" ON public.ordens_servico FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Equipe edita ordens" ON public.ordens_servico FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Equipe exclui ordens" ON public.ordens_servico FOR DELETE TO authenticated USING (true);
CREATE TRIGGER ordens_servico_updated_at BEFORE UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();