// Validação de CNPJ na Receita Federal via APIs públicas gratuitas.
//   Primário:  https://publica.cnpj.ws/cnpj/<cnpj>   (3 req/min por IP)
//   Fallback:  https://brasilapi.com.br/api/cnpj/v1/<cnpj>
// fetch é global no browser e no React Native — roda nas duas stacks.

export interface CnpjInfo {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacao: string; // normalizado em CAIXA ALTA: "ATIVA", "BAIXADA", "SUSPENSA", ...
  ativa: boolean;
}

export type CnpjResult =
  | { ok: true; data: CnpjInfo }
  | { ok: false; error: string };

function isAtiva(situacao: string): boolean {
  return situacao.trim().toUpperCase().startsWith("ATIV");
}

// publica.cnpj.ws: razao_social no topo, situação em estabelecimento.situacao_cadastral ("Ativa")
async function fromCnpjWs(cnpj: string): Promise<CnpjResult | null> {
  const res = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return { ok: false, error: "CNPJ não encontrado na Receita Federal." };
  if (res.status === 429) return null; // rate limit → tenta fallback
  if (!res.ok) return null;

  const d = await res.json();
  const situacao = String(d?.estabelecimento?.situacao_cadastral ?? "");
  if (!situacao) return null;

  return {
    ok: true,
    data: {
      cnpj,
      razaoSocial: d?.razao_social ?? "",
      nomeFantasia: d?.estabelecimento?.nome_fantasia ?? "",
      situacao: situacao.toUpperCase(),
      ativa: isAtiva(situacao),
    },
  };
}

// BrasilAPI: descricao_situacao_cadastral ("ATIVA"), razao_social, nome_fantasia
async function fromBrasilApi(cnpj: string): Promise<CnpjResult | null> {
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return { ok: false, error: "CNPJ não encontrado na Receita Federal." };
  if (!res.ok) return null;

  const d = await res.json();
  const situacao = String(d?.descricao_situacao_cadastral ?? "");
  if (!situacao) return null;

  return {
    ok: true,
    data: {
      cnpj,
      razaoSocial: d?.razao_social ?? "",
      nomeFantasia: d?.nome_fantasia ?? "",
      situacao: situacao.toUpperCase(),
      ativa: isAtiva(situacao),
    },
  };
}

/**
 * Consulta um CNPJ na Receita. Tenta publica.cnpj.ws e cai pra BrasilAPI
 * se houver rate limit / falha. Retorna ok:false com mensagem amigável
 * quando inválido, não encontrado, ou ambas as fontes falharem.
 */
export async function fetchCnpj(rawCnpj: string): Promise<CnpjResult> {
  const cnpj = (rawCnpj || "").replace(/\D/g, "");
  if (cnpj.length !== 14) return { ok: false, error: "CNPJ deve ter 14 dígitos." };

  try {
    const primary = await fromCnpjWs(cnpj);
    if (primary) return primary;

    const fallback = await fromBrasilApi(cnpj);
    if (fallback) return fallback;

    return { ok: false, error: "Não foi possível validar o CNPJ agora. Tente novamente em instantes." };
  } catch {
    return { ok: false, error: "Erro de conexão ao validar o CNPJ." };
  }
}
