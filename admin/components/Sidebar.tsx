"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Wallet,
  Gavel,
  Receipt,
  CreditCard,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { signOut } from "@/app/login/actions";

const nav = [
  { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/usuarios", label: "Usuários", icon: Users },
  { href: "/servicos", label: "Serviços", icon: Briefcase },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/disputas", label: "Disputas", icon: Gavel },
  { href: "/hub-fiscal", label: "Hub Fiscal", icon: Receipt },
  { href: "/planos", label: "Planos", icon: CreditCard },
];

export function Sidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="px-5 py-5 border-b border-slate-200 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center text-white">
          <ShieldCheck size={16} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Fixr Admin</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Painel</p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-slate-200">
        <div className="px-2 pb-2 text-[11px] text-slate-500 truncate" title={adminName}>
          {adminName}
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <LogOut size={15} />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
