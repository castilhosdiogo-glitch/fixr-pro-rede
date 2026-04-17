import { useState } from "react";
import { MapPin, Loader2, Power, CheckCircle2 } from "lucide-react";
import { useProAvailability, useUpdateProAvailability } from "@/hooks/useProAvailability";

export function DisponibilidadeCard() {
  const { data, isLoading } = useProAvailability();
  const { mutate: update, isPending } = useUpdateProAvailability();
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [raioLocal, setRaioLocal] = useState<number | null>(null);

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
        <Loader2 size={14} className="animate-spin text-muted-foreground" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Carregando disponibilidade...
        </p>
      </div>
    );
  }

  const raio = raioLocal ?? data.raio_km;
  const hasLocation = data.latitude != null && data.longitude != null;

  const captureLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocalização não suportada no navegador");
      return;
    }
    setGeoError(null);
    setGeoLoading(true);

    // Tenta 2x: primeiro rede (rápido, indoor OK), fallback pra GPS alta precisão.
    // enableHighAccuracy:false usa Wi-Fi/torre celular — precisão 20-100m, suficiente pro raio.
    const tryLowAccuracy = () =>
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        onLowFail,
        { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
      );

    const tryHighAccuracy = () =>
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        onHighFail,
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
      );

    const onSuccess = (pos: GeolocationPosition) => {
      update(
        {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        },
        { onSettled: () => setGeoLoading(false) },
      );
    };

    const onLowFail = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setGeoLoading(false);
        setGeoError("Permissão negada — libere a localização no Chrome e nas Configurações do Android");
        return;
      }
      // Rede não achou → tenta GPS
      tryHighAccuracy();
    };

    const onHighFail = (err: GeolocationPositionError) => {
      setGeoLoading(false);
      if (err.code === err.PERMISSION_DENIED) {
        setGeoError("Permissão negada — libere a localização nas configurações");
      } else if (err.code === err.TIMEOUT) {
        setGeoError("Tempo esgotado — ative o GPS e tente de novo em local aberto");
      } else {
        setGeoError("Localização indisponível — verifique se o GPS está ativado no Android");
      }
    };

    tryLowAccuracy();
  };

  const commitRaio = () => {
    if (raioLocal != null && raioLocal !== data.raio_km) {
      update({ raio_km: raioLocal });
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              data.disponivel ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
            }`}
          >
            <Power size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
              {data.disponivel ? "Disponível para pedidos" : "Indisponível"}
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              {data.disponivel
                ? "Você está recebendo novos pedidos"
                : "Você não recebe pedidos até reativar"}
            </p>
          </div>
        </div>
        <button
          onClick={() => update({ disponivel: !data.disponivel })}
          disabled={isPending}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            data.disponivel ? "bg-emerald-500" : "bg-muted"
          } disabled:opacity-50`}
          aria-label="Alternar disponibilidade"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              data.disponivel ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-foreground">
            Raio de atendimento
          </label>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            {raio} km
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          step={1}
          value={raio}
          onChange={(e) => setRaioLocal(Number(e.target.value))}
          onMouseUp={commitRaio}
          onTouchEnd={commitRaio}
          disabled={isPending}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
          <span>1 km</span>
          <span>25 km</span>
          <span>50 km</span>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        {hasLocation ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
                  Localização definida
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}
                </p>
              </div>
            </div>
            <button
              onClick={captureLocation}
              disabled={geoLoading || isPending}
              className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              {geoLoading ? <Loader2 size={12} className="animate-spin" /> : "Atualizar"}
            </button>
          </div>
        ) : (
          <button
            onClick={captureLocation}
            disabled={geoLoading || isPending}
            className="w-full rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-3 flex items-center gap-3 hover:border-primary hover:bg-primary/10 transition-all disabled:opacity-50"
          >
            {geoLoading ? (
              <Loader2 size={14} className="animate-spin text-primary flex-shrink-0" />
            ) : (
              <MapPin size={14} className="text-primary flex-shrink-0" />
            )}
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                {geoLoading ? "Obtendo localização..." : "Definir minha localização"}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Necessário para receber pedidos dentro do seu raio
              </p>
            </div>
          </button>
        )}
        {geoError && (
          <p className="text-[9px] font-black uppercase tracking-widest text-destructive mt-2">
            {geoError}
          </p>
        )}
      </div>
    </div>
  );
}
