import { describe, it, expect } from "vitest";

const getNavItems = (userType: string | undefined) => {
  const isProfessional = userType === "professional";
  return [
    { path: "/", label: "Início" },
    isProfessional
      ? { path: "/dashboard", label: "Demandas" }
      : { path: "/buscar", label: "Buscar" },
    { path: "/mensagens", label: "Mensagens" },
    { path: "/perfil", label: "Perfil" },
  ];
};

describe("BottomNav Role-Based Logic", () => {
  it("should show 'Demandas' for professionals", () => {
    const items = getNavItems("professional");
    expect(items.some(i => i.label === "Demandas")).toBe(true);
    expect(items.some(i => i.label === "Buscar")).toBe(false);
  });

  it("should show 'Buscar' for clients", () => {
    const items = getNavItems("client");
    expect(items.some(i => i.label === "Buscar")).toBe(true);
    expect(items.some(i => i.label === "Demandas")).toBe(false);
  });

  it("should show 'Buscar' for guests", () => {
    const items = getNavItems(undefined);
    expect(items.some(i => i.label === "Buscar")).toBe(true);
  });
});
