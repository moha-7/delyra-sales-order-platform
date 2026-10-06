"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/modules/auth/navigation";

const icons: Record<string, string> = {
  Dashboard: "bi-grid-1x2-fill",
  Leads: "bi-person-plus-fill",
  Customers: "bi-people-fill",
  Opportunities: "bi-kanban-fill",
  Tasks: "bi-check2-square",
  Pricing: "bi-calculator-fill",
  "Won Orders": "bi-box-seam-fill",
  "Executive Reports": "bi-bar-chart-fill",
  Audit: "bi-shield-check",
  Administration: "bi-gear-fill",
};

export function SidebarNavigation({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1.5" aria-label="Main navigation">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-extrabold transition ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-950/20" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
          >
            <i
              className={`bi ${icons[item.label] ?? "bi-circle-fill"} text-base ${active ? "text-white" : "text-slate-400 group-hover:text-white"}`}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
