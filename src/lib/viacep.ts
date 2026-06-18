// ViaCEP — consulta de endereço por CEP.
// API pública gratuita, sem chave: https://viacep.com.br/ws/<cep>/json/
// fetch é global no browser e no React Native — este módulo roda nas duas stacks.

export interface CepAddress {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/**
 * Consulta um CEP no ViaCEP. Aceita CEP com ou sem máscara.
 * Retorna null se o CEP for inválido (≠ 8 dígitos), não existir, ou a rede falhar.
 */
export async function fetchCep(rawCep: string): Promise<CepAddress | null> {
  const cep = (rawCep || "").replace(/\D/g, "");
  if (cep.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;

    return {
      cep: data.cep ?? "",
      logradouro: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      cidade: data.localidade ?? "",
      uf: data.uf ?? "",
    };
  } catch {
    return null;
  }
}

/** Formata 8 dígitos como XXXXX-XXX. Entrada parcial retorna só os dígitos. */
export function formatCep(rawCep: string): string {
  const cep = (rawCep || "").replace(/\D/g, "").slice(0, 8);
  if (cep.length <= 5) return cep;
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}
