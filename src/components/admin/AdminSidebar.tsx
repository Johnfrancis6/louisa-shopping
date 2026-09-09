import Link from "next/link";

const NAV = [
  { href: "/admin/orders", label: "Commandes" },
  { href: "/admin/products", label: "Catalogue" },
  { href: "/admin/categories", label: "Catégories" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/reviews", label: "Avis" },
  { href: "/admin/whatsapp", label: "WhatsApp" },
] as const;

export function AdminSidebar() {
  return (
    <nav className="flex w-52 shrink-0 flex-col gap-1 bg-neutral-900 p-4 text-white">
      <Link href="/admin" className="mb-2 px-3 text-sm font-semibold uppercase tracking-wide text-white/60">
        Louisa · Admin
      </Link>
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded px-3 py-2 text-[15px] hover:bg-white/10"
        >
          {item.label}
        </Link>
      ))}
      <Link
        href="/"
        className="mt-auto rounded px-3 py-2 text-sm text-white/60 hover:bg-white/10"
      >
        ← Retour au site
      </Link>
    </nav>
  );
}
