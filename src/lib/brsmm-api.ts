export interface BrsmmBalanceResponse {
  balance: string;
  currency: string;
}

export interface BrsmmCreateOrderParams {
  service: number;
  link: string;
  quantity: number;
  comments?: string;
}

export interface BrsmmCreateOrderResponse {
  order?: number;
  error?: string;
}

export interface BrsmmOrderStatusResponse {
  charge?: string;
  start_count?: string;
  status?: string;
  remains?: string;
  currency?: string;
  error?: string;
}

const BRSMM_API_KEY = "8b7cd4c8cef63a4538339219cdcbb7cf";

async function postToBrsmm(params: Record<string, string | number>): Promise<any> {
  const form = new URLSearchParams();
  form.append("key", BRSMM_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    form.append(k, String(v));
  }

  // Try proxy endpoint first to prevent CORS
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
    console.warn("Proxy call to /api/brsmm failed, trying direct...", err);
  }

  // Fallback to direct call
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
 * Consulta o saldo real da conta no BRSMM
 */
export async function getBrsmmBalance(): Promise<BrsmmBalanceResponse | null> {
  try {
    const data = await postToBrsmm({ action: "balance" });
    if (data && data.balance) {
      return data as BrsmmBalanceResponse;
    }
    return null;
  } catch (e) {
    console.error("Erro ao consultar saldo BRSMM:", e);
    return null;
  }
}

/**
 * Envia um pedido real para a API do BRSMM
 */
export async function submitRealBrsmmOrder(
  params: BrsmmCreateOrderParams
): Promise<BrsmmCreateOrderResponse> {
  try {
    const data = await postToBrsmm({
      action: "add",
      service: params.service,
      link: params.link,
      quantity: params.quantity,
      ...(params.comments ? { comments: params.comments } : {}),
    });

    return data as BrsmmCreateOrderResponse;
  } catch (e: any) {
    console.error("Erro ao enviar pedido BRSMM:", e);
    return { error: e?.message || "Erro de conexão com o servidor BRSMM" };
  }
}

/**
 * Consulta o status de um pedido na API do BRSMM
 */
export async function getBrsmmOrderStatus(
  orderId: number | string
): Promise<BrsmmOrderStatusResponse | null> {
  try {
    const data = await postToBrsmm({
      action: "status",
      order: orderId,
    });
    return data as BrsmmOrderStatusResponse;
  } catch (e) {
    console.error("Erro ao consultar status BRSMM:", e);
    return null;
  }
}
