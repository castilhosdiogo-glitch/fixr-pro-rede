// Geocoding via Nominatim (OpenStreetMap) — endereço → coordenadas.
// Gratuito, sem chave. Política de uso: máx 1 req/s, sem autocomplete spam.
// O browser envia Referer automaticamente (satisfaz a policy pra uso leve).
// fetch é global no browser e no React Native.

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

/**
 * Geocodifica um endereço livre (rua, bairro, cidade, CEP) no Brasil.
 * Retorna o melhor resultado ou null se vazio / sem match / falha de rede.
 */
export async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  const q = (query || "").trim();
  if (q.length < 4) return null;

  try {
    const url =
      "https://nominatim.openstreetmap.org/search" +
      `?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;

    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;

    const r = arr[0];
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      label: r.display_name ?? q,
    };
  } catch {
    return null;
  }
}
