import Link from "next/link";

const NAV = [
  { href: "/admin/orders", label: "Commandes" },
  { href: "/admin/products", label: "Catalogue" },
  { href: "/admin/categories", label: "Catégories" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/whatsapp", label: "WhatsApp" },
] as const;

export function AdminSidebar() {
  return (
    <nav
      className="admin-dense flex flex-col gap-[var(--ls-space-2)] p-[var(--ls-space-4)] w-56 shrink-0"
      style={{ background: "var(--ls-admin-sidebar-bg)", color: "var(--ls-admin-sidebar-text)" }}
    >
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded px-[var(--ls-space-3)] py-[var(--ls-space-2)] text-[15px] hover:bg-white/10"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}