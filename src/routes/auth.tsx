import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { ClipboardCheck, ShieldCheck, Smartphone } from "lucide-react";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/fixcell/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value, "http://x");
    if (url.origin !== "http://x" && typeof window !== "undefined" && url.origin !== window.location.origin)
      return undefined;
    const path = url.pathname + url.search;
    return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/auth") ? path : undefined;
  } catch {
    return undefined;
  }
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — FixCell" },
      { name: "description", content: "Acesse o sistema da FixCell para gerenciar clientes e ordens de serviço." },
      { property: "og:title", content: "Entrar — FixCell" },
      { property: "og:description", content: "Acesse o sistema da FixCell para gerenciar clientes e ordens de serviço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo de 6 caracteres").max(72),
});
const signupSchema = loginSchema.extend({
  nome: z.string().trim().min(1, "Informe seu nome").max(120),
  cargo: z.string().trim().max(60),
});

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const destino = safeRedirect(search.redirect) ?? "/painel";
  const [tab, setTab] = useState("entrar");
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState({ nome: "", cargo: "", email: "", password: "" });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: destino, replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: destino, replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [destino, navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(login);
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return void toast.error("E-mail ou senha incorretos.");
    navigate({ to: destino, replace: true });
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse(signup);
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome: parsed.data.nome, cargo: parsed.data.cargo },
      },
    });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("registered")) return void toast.error("Este e-mail já possui conta. Faça login.");
      if (msg.includes("pwned") || msg.includes("weak") || msg.includes("leaked"))
        return void toast.error("Essa senha é muito comum. Escolha outra mais forte.");
      return void toast.error("Não foi possível criar a conta.");
    }
    if (data.session) {
      toast.success("Conta criada! Bem-vindo(a) à FixCell.");
      navigate({ to: destino, replace: true });
    } else {
      toast.success("Conta criada. Confira seu e-mail para confirmar o acesso.");
    }
  }

  async function oauth(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) return void toast.error("Não foi possível entrar agora.");
    if (result.redirected) return;
    navigate({ to: destino, replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Painel de marca */}
      <aside className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 invert" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-gradient opacity-30 blur-3xl" />
        <Logo className="relative" />
        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight">
            Cada reparo registrado, <span className="text-sidebar-primary">do balcão à entrega.</span>
          </h1>
          <p className="mt-4 text-sidebar-muted">
            Cadastre clientes, abra ordens de serviço e acompanhe o status de cada aparelho em um só lugar.
          </p>
          <ul className="mt-10 space-y-4 text-sm">
            {[
              { icon: Smartphone, t: "Aparelho, IMEI e defeito relatado" },
              { icon: ClipboardCheck, t: "Status do reparo sempre atualizado" },
              { icon: ShieldCheck, t: "Acesso individual para cada funcionário" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-sidebar-muted">© {new Date().getFullYear()} FixCell Assistência Técnica</p>
      </aside>

      {/* Formulário */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo tone="light" className="mb-8 lg:hidden" />
          <h2 className="text-2xl font-semibold">{tab === "entrar" ? "Acesse sua conta" : "Criar conta da equipe"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "entrar" ? "Entre para gerenciar as ordens de serviço." : "Cadastre-se para acessar o sistema."}
          </p>

          <Tabs value={tab} onValueChange={setTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="cadastrar">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar">
              <form onSubmit={entrar} className="mt-4 grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="l-email">E-mail</Label>
                  <Input id="l-email" type="email" autoComplete="email" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="l-pass">Senha</Label>
                  <Input id="l-pass" type="password" autoComplete="current-password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />
                </div>
                <Button type="submit" size="lg" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="cadastrar">
              <form onSubmit={cadastrar} className="mt-4 grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="s-nome">Nome</Label>
                    <Input id="s-nome" value={signup.nome} onChange={(e) => setSignup({ ...signup, nome: e.target.value })} maxLength={120} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="s-cargo">Cargo</Label>
                    <Input id="s-cargo" placeholder="Técnico" value={signup.cargo} onChange={(e) => setSignup({ ...signup, cargo: e.target.value })} maxLength={60} />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="s-email">E-mail</Label>
                  <Input id="s-email" type="email" autoComplete="email" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="s-pass">Senha</Label>
                  <Input id="s-pass" type="password" autoComplete="new-password" value={signup.password} onChange={(e) => setSignup({ ...signup, password: e.target.value })} />
                </div>
                <Button type="submit" size="lg" disabled={loading}>
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3">
            <button type="button" onClick={() => oauth("google")} className="google-btn inline-flex h-10 w-full items-center justify-center rounded-md transition-colors">
              <GoogleIcon />
              Continuar com Google
            </button>
            <button type="button" className="lovable-auth-button" onClick={() => oauth("lovable")}>
              Continuar com Lovable
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
