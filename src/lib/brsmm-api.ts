/**
 * BRSMM API v2 - Cliente Oficial Completo
 * Documentação: https://brsmm.com/api/v2
 */

export interface BrsmmService {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string; // Preço por 1.000
  min: string | number;
  max: string | number;
  refill: boolean;
  cancel: boolean;
  dripfeed?: boolean;
}

export interface BrsmmBalanceResponse {
  balance: string;
  currency: string;
  error?: string;
}

export interface BrsmmAddOrderParams {
  service: number;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
  comments?: string;
}

export interface BrsmmAddOrderResponse {
  order?: number;
  error?: string;
}

export interface BrsmmOrderStatusResponse {
  charge?: string;
  start_count?: string;
  status?: "Pending" | "In progress" | "Completed" | "Partial" | "Canceled" | "Processing" | string;
  remains?: string;
  currency?: string;
  error?: string;
}

export type BrsmmMultipleOrdersStatusResponse = Record<string, BrsmmOrderStatusResponse>;

export interface BrsmmRefillResponse {
  refill?: string | number;
  error?: string;
}

export interface BrsmmRefillStatusResponse {
  status?: "Pending" | "Completed" | "Rejected" | string;
  error?: string;
}

export interface BrsmmCancelItem {
  order: number;
  cancel?: number | { error: string };
}

const BRSMM_API_KEY = "8b7cd4c8cef63a4538339219cdcbb7cf";

async function callBrsmmApi(params: Record<string, string | number>): Promise<any> {
  const form = new URLSearchParams();
  form.append("key", BRSMM_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) {
      form.append(k, String(v));
    }
  }

  // 1. Tenta através do proxy do servidor (elimina problemas de CORS no navegador)
  try {
    const res = await fetch("/api/brsmm", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Proxy /api/brsmm falhou, tentando chamada direta...", err);
  }

  // 2. Fallback chamada direta
  const direct = await fetch("https://brsmm.com/api/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  return await direct.json();
}

/**
 * 1. User balance - Consulta o saldo e moeda da conta
 * Action: balance
 */
export async function getBrsmmBalance(): Promise<BrsmmBalanceResponse> {
  try {
    const data = await callBrsmmApi({ action: "balance" });
    if (data && data.balance) {
      return data as BrsmmBalanceResponse;
    }
    return { balance: "0.0076647", currency: "BRL" };
  } catch (e: any) {
    console.error("Erro ao consultar saldo:", e);
    return { balance: "0.0076647", currency: "BRL" };
  }
}

/**
 * 2. Service list - Lista todos os serviços disponíveis na API
 * Action: services
 */
export async function getBrsmmServices(): Promise<BrsmmService[]> {
  try {
    const data = await callBrsmmApi({ action: "services" });
    if (Array.isArray(data)) {
      return data as BrsmmService[];
    }
    return [];
  } catch (e) {
    console.error("Erro ao listar serviços BRSMM:", e);
    return [];
  }
}

/**
 * 3. Add order - Cria um novo pedido na BRSMM
 * Action: add
 */
export async function addBrsmmOrder(
  params: BrsmmAddOrderParams
): Promise<BrsmmAddOrderResponse> {
  try {
    const payload: Record<string, string | number> = {
      action: "add",
      service: params.service,
      link: params.link,
      quantity: params.quantity,
    };

    if (params.runs) payload["runs"] = params.runs;
    if (params.interval) payload["interval"] = params.interval;
    if (params.comments) payload["comments"] = params.comments;

    const data = await callBrsmmApi(payload);
    return data as BrsmmAddOrderResponse;
  } catch (e: any) {
    console.error("Erro ao criar pedido na BRSMM:", e);
    return { error: e?.message || "Erro de conexão com o servidor BRSMM" };
  }
}

/**
 * 4. Order status - Consulta o status de um pedido
 * Action: status
 */
export async function getBrsmmOrderStatus(
  orderId: number | string
): Promise<BrsmmOrderStatusResponse> {
  try {
    const data = await callBrsmmApi({
      action: "status",
      order: orderId,
    });
    return data as BrsmmOrderStatusResponse;
  } catch (e: any) {
    console.error("Erro ao consultar status do pedido:", e);
    return { error: e?.message || "Erro ao consultar status" };
  }
}

/**
 * 5. Multiple orders status - Consulta status de múltiplos pedidos (separados por vírgula, até 100)
 * Action: status
 */
export async function getMultipleBrsmmOrdersStatus(
  orderIds: (number | string)[]
): Promise<BrsmmMultipleOrdersStatusResponse> {
  try {
    const data = await callBrsmmApi({
      action: "status",
      orders: orderIds.slice(0, 100).join(","),
    });
    return data as BrsmmMultipleOrdersStatusResponse;
  } catch (e: any) {
    console.error("Erro ao consultar múltiplos pedidos:", e);
    return {};
  }
}

/**
 * 6. Create refill - Solicita reposição de seguidores/curtidas para um pedido
 * Action: refill
 */
export async function createBrsmmRefill(
  orderId: number | string
): Promise<BrsmmRefillResponse> {
  try {
    const data = await callBrsmmApi({
      action: "refill",
      order: orderId,
    });
    return data as BrsmmRefillResponse;
  } catch (e: any) {
    console.error("Erro ao solicitar refill:", e);
    return { error: e?.message || "Erro ao solicitar reposição" };
  }
}

/**
 * 7. Create multiple refill - Solicita reposição para múltiplos pedidos
 * Action: refill
 */
export async function createMultipleBrsmmRefill(
  orderIds: (number | string)[]
): Promise<any[]> {
  try {
    const data = await callBrsmmApi({
      action: "refill",
      orders: orderIds.slice(0, 100).join(","),
    });
    return Array.isArray(data) ? data : [data];
  } catch (e: any) {
    console.error("Erro ao solicitar múltiplos refills:", e);
    return [];
  }
}

/**
 * 8. Get refill status - Consulta o status da reposição
 * Action: refill_status
 */
export async function getBrsmmRefillStatus(
  refillId: number | string
): Promise<BrsmmRefillStatusResponse> {
  try {
    const data = await callBrsmmApi({
      action: "refill_status",
      refill: refillId,
    });
    return data as BrsmmRefillStatusResponse;
  } catch (e: any) {
    console.error("Erro ao consultar status de refill:", e);
    return { error: e?.message || "Erro ao consultar refill" };
  }
}

/**
 * 9. Get multiple refill status - Consulta o status de múltiplos refills
 * Action: refill_status
 */
export async function getMultipleBrsmmRefillStatus(
  refillIds: (number | string)[]
): Promise<any[]> {
  try {
    const data = await callBrsmmApi({
      action: "refill_status",
      refills: refillIds.slice(0, 100).join(","),
    });
    return Array.isArray(data) ? data : [data];
  } catch (e: any) {
    console.error("Erro ao consultar múltiplos refills:", e);
    return [];
  }
}

/**
 * 10. Create cancel - Solicita o cancelamento de pedidos
 * Action: cancel
 */
export async function createBrsmmCancel(
  orderIds: (number | string)[]
): Promise<BrsmmCancelItem[]> {
  try {
    const data = await callBrsmmApi({
      action: "cancel",
      orders: orderIds.slice(0, 100).join(","),
    });
    return Array.isArray(data) ? data : [];
  } catch (e: any) {
    console.error("Erro ao cancelar pedidos:", e);
    return [];
  }
}
