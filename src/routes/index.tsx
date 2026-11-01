import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: DashboardPage,
  head: () => ({
    title: "ITHALO IA | Painel WhatsApp & Simulador",
    meta: [
      {
        name: "description",
        content:
          "Painel de Controle Oficial ITHALO IA - Simulador de WhatsApp Dark Mode, Gestão de Contatos e Vozes Neurais.",
      },
    ],
  }),
});

function DashboardPage() {
  return (
    <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden z-[99999]">
      <iframe
        src="/dashboard.html"
        className="w-full h-full border-0 block"
        title="ITHALO IA Dashboard"
        allow="clipboard-write; microphone; autoplay"
      />
    </div>
  );
}
