const STYLES: Record<string, string> = {
  pending_whatsapp: "bg-[var(--ls-gray-200)] text-[var(--ls-gray-900)]",
  confirmed: "bg-[var(--ls-accent-light)] text-[var(--ls-accent-dark)]",
  processing: "bg-[var(--ls-accent-light)] text-[var(--ls-accent)]",
  shipped: "bg-[var(--ls-accent-light)] text-[var(--ls-accent)]",
  delivered: "bg-green-50 text-[var(--ls-success)]",
  cancelled: "bg-red-50 text-[var(--ls-danger)]",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded px-[var(--ls-space-2)] py-[2px] text-[12px] font-medium ${STYLES[status] ?? ""}`}>
      {status}
    </span>
  );
}