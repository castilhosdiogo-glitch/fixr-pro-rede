import { useCallback, useState } from "react";
import { fetchCep, type CepAddress } from "@/lib/viacep";

/**
 * Hook web pra consulta de CEP via ViaCEP.
 * `lookup` retorna o endereço ou null (CEP inválido / não encontrado / rede).
 */
export function useCep() {
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async (cep: string): Promise<CepAddress | null> => {
    setLoading(true);
    try {
      return await fetchCep(cep);
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading };
}
