import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FixCell — Assistência técnica de celulares" },
      { name: "description", content: "Painel da FixCell para gerenciar clientes e ordens de serviço." },
      { property: "og:title", content: "FixCell — Assistência técnica de celulares" },
      { property: "og:description", content: "Painel da FixCell para gerenciar clientes e ordens de serviço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/painel" });
  },
});
