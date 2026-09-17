import {
  ShieldCheck,
  Zap,
  Tag,
  Headphones,
  RefreshCw,
  Code2,
} from "lucide-react";

export function WhyChooseUs() {
  const benefits = [
    {
      icon: Tag,
      title: "Preço Direto de Fornecedor",
      description:
        "Sem intermediários. Trabalhamos com servidores próprios com alta capacidade, garantindo o menor preço do mercado para você revender ou usar.",
      color: "from-amber-400 to-orange-500",
    },
    {
      icon: Zap,
      title: "Entrega 100% Automatizada",
      description:
        "Assim que seu pedido é confirmado, nosso sistema aciona as filas de envio imediatamente, iniciando a entrega em questão de minutos.",
      color: "from-orange-400 to-rose-500",
    },
    {
      icon: ShieldCheck,
      title: "Zero Risco & Sem Senhas",
      description:
        "Nunca solicitamos sua senha ou acesso à sua conta. Apenas precisamos do link público ou do seu nome de usuário (@) para enviar.",
      color: "from-emerald-400 to-teal-500",
    },
    {
      icon: RefreshCw,
      title: "Reposição Automática (Refill)",
      description:
        "Serviços selecionados possuem garantia de reposição de 30 dias. Se houver oscilação natural, nosso sistema reabastece sem custo.",
      color: "from-sky-400 to-blue-500",
    },
    {
      icon: Code2,
      title: "API Completa para Revenda",
      description:
        "Conecte seu próprio site ou painel SMM via API RESTful padrão e automatize todas as suas vendas com margens de lucro de até 300%.",
      color: "from-purple-400 to-indigo-500",
    },
    {
      icon: Headphones,
      title: "Suporte 24/7 Humanizado",
      description:
        "Equipe técnica disponível todos os dias via WhatsApp e sistema de tickets para tirar dúvidas e acompanhar seus pedidos.",
      color: "from-rose-400 to-pink-500",
    },
  ];

  return (
    <section className="py-16 md:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Por que Somos a Escolha #1</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Vantagens Exclusivas do BRSMM
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            A tecnologia mais estável e segura para acelerar a autoridade das suas redes sociais.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {benefits.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="necromancer-card p-7 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${item.color} p-[1px] mb-5`}
                >
                  <div className="w-full h-full bg-[#06060a] rounded-[15px] flex items-center justify-center text-white">
                    <Icon className="w-5 h-5 text-cyan-300 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
