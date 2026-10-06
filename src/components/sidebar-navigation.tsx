"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem, NavigationSection } from "@/modules/auth/navigation";

const sectionLabels: Record<NavigationSection, string> = {
  workspace: "Workspace",
  work: "Work queue",
  control: "Control",
};

const sectionOrder: NavigationSection[] = ["workspace", "work", "control"];

export function SidebarNavigation({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="uk-sidebar-nav" aria-label="Main navigation">
      {sectionOrder.map((section) => {
        const sectionItems = items.filter((item) => item.section === section);
        if (!sectionItems.length) return null;

        return (
          <div className="uk-nav-section" key={section}>
            <span className="uk-nav-section-title">{sectionLabels[section]}</span>
            {sectionItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={active ? "is-active" : undefined}
                  href={item.href}
                  key={item.href}
                >
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
