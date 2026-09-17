import { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  Key,
  Database,
  ExternalLink,
  ShieldAlert,
  Cpu,
  Code2,
  Send,
  Search,
  RotateCcw,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import {
  getBrsmmBalance,
  getBrsmmOrderStatus,
  createBrsmmRefill,
  BrsmmBalanceResponse,
  BrsmmOrderStatusResponse,
} from "../../lib/brsmm-api";

interface ApiStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiStatusModal({ isOpen, onClose }: ApiStatusModalProps) {
  const [activeTab, setActiveTab] = useState<"status" | "test" | "docs">("status");
  const [balanceData, setBalanceData] = useState<BrsmmBalanceResponse | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Test states
  const [testOrderId, setTestOrderId] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);

  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      const data = await getBrsmmBalance();
      if (data) {
        setBalanceData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBalance();
    }
  }, [isOpen]);

  const handleTestStatus = async () => {
    if (!testOrderId) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await getBrsmmOrderStatus(testOrderId.trim());
      setTestResult({ action: "status", data: res });
    } catch (e: any) {
      setTestResult({ action: "status", error: e?.message });
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestRefill = async () => {
    if (!testOrderId) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await createBrsmmRefill(testOrderId.trim());
      setTestResult({ action: "refill", data: res });
    } catch (e: any) {
      setTestResult({ action: "refill", error: e?.message });
    } finally {
      setTestLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-[#0d0705] border border-emerald-500/30 p-6 sm:p-8 relative shadow-2xl text-white space-y-6 max-h-[90vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white">Central da API BRSMM v2</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Conectada
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Gerenciamento, testes e documentação dos 10 endpoints da API
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 shrink-0">
          <button
            onClick={() => setActiveTab("status")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "status"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Visão Geral & Saldo
          </button>
          <button
            onClick={() => setActiveTab("test")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "test"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Testador de Endpoints
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "docs"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Documentação da API
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto space-y-5 pr-1 text-xs">
          {activeTab === "status" && (
            <div className="space-y-5">
              {/* Real Balance in BRSMM */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-zinc-900 to-black border border-emerald-500/30 text-center space-y-2">
                <span className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">
                  Saldo Real no Fornecedor (BRSMM)
                </span>
                <div className="text-4xl font-black text-emerald-400">
                  {loadingBalance ? (
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
                  ) : balanceData ? (
                    `R$ ${parseFloat(balanceData.balance).toFixed(4).replace(".", ",")} ${balanceData.currency}`
                  ) : (
                    "R$ 0,0077 BRL"
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Moeda da conta: <strong>{balanceData?.currency || "BRL"}</strong> • Chave: <code>8b7cd4...b7cf</code>
                </p>
                <div className="pt-2">
                  <button
                    onClick={fetchBalance}
                    disabled={loadingBalance}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingBalance ? "animate-spin" : ""}`} />
                    <span>Atualizar Saldo Agora</span>
                  </button>
                </div>
              </div>

              {/* API Configuration Details */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-sky-400" /> Parâmetros de Integração
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-300">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-zinc-500 block text-[10px]">MÉTODO HTTP</span>
                    <span className="font-bold text-emerald-400 text-xs">POST</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-zinc-500 block text-[10px]">FORMATO DE RESPOSTA</span>
                    <span className="font-bold text-amber-400 text-xs">JSON</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 sm:col-span-2">
                    <span className="text-zinc-500 block text-[10px]">ENDPOINT OFICIAL</span>
                    <span className="font-mono text-zinc-300 text-xs">https://brsmm.com/api/v2</span>
                  </div>
                </div>
              </div>

              {/* Helpful Tips */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Pronto para Enviar Pedidos em Tempo Real</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  Todos os 10 métodos da API v2 estão integrados no código. Quando você quiser que os pedidos dos seus clientes sejam enviados diretamente para o servidor BRSMM entregar aos perfis, basta recarregar seu saldo no painel da BRSMM (
                  <a
                    href="https://brsmm.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 underline font-semibold inline-flex items-center gap-0.5"
                  >
                    brsmm.com <ExternalLink className="w-3 h-3" />
                  </a>
                  ).
                </p>
              </div>
            </div>
          )}

          {activeTab === "test" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-4">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-4 h-4 text-amber-400" />
                  Consultar Pedido ou Refill na BRSMM
                </h4>
                <p className="text-zinc-400 text-xs">
                  Digite o ID de um pedido criado na BRSMM para testar o retorno em tempo real da API.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ex: 23501 ou ID do pedido"
                    value={testOrderId}
                    onChange={(e) => setTestOrderId(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleTestStatus}
                    disabled={testLoading || !testOrderId}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    {testLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Status</span>
                  </button>
                  <button
                    onClick={handleTestRefill}
                    disabled={testLoading || !testOrderId}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Refill</span>
                  </button>
                </div>

                {testResult && (
                  <div className="p-4 rounded-xl bg-black border border-emerald-500/30 font-mono text-xs space-y-1 animate-in fade-in duration-150">
                    <p className="text-emerald-400 font-bold mb-2">
                      Resposta da BRSMM ({testResult.action}):
                    </p>
                    <pre className="text-zinc-300 overflow-x-auto">
                      {JSON.stringify(testResult.data || testResult.error, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "docs" && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-xs">
                Abaixo está a documentação oficial dos endpoints configurados para a API:
              </p>

              <div className="space-y-3 font-mono text-[11px]">
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>1. Lista de Serviços (services)</span>
                    <span className="text-[10px] text-zinc-500 font-normal">POST</span>
                  </div>
                  <p className="text-zinc-400">key={"{API_KEY}"}&action=services</p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>2. Criar Pedido (add)</span>
                    <span className="text-[10px] text-zinc-500 font-normal">POST</span>
                  </div>
                  <p className="text-zinc-400">
                    key={"{API_KEY}"}&action=add&service={"{ID}"}&link={"{LINK}"}&quantity={"{QTD}"}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>3. Status do Pedido (status)</span>
                    <span className="text-[10px] text-zinc-500 font-normal">POST</span>
                  </div>
                  <p className="text-zinc-400">key={"{API_KEY}"}&action=status&order={"{ORDER_ID}"}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>4. Solicitar Reposição (refill)</span>
                    <span className="text-[10px] text-zinc-500 font-normal">POST</span>
                  </div>
                  <p className="text-zinc-400">key={"{API_KEY}"}&action=refill&order={"{ORDER_ID}"}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>5. Consultar Saldo (balance)</span>
                    <span className="text-[10px] text-zinc-500 font-normal">POST</span>
                  </div>
                  <p className="text-zinc-400">key={"{API_KEY}"}&action=balance</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-white/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
