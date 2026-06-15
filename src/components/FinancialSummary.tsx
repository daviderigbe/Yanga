import { formatNGN } from "@/lib/api";

const BUYER_FIELDS = [
  ["subtotal", "Item subtotal"],
  ["deliveryFee", "Delivery fee"],
  ["serviceFee", "Service fee"],
  ["totalAmount", "Total"],
] as const;

const SELLER_FIELDS = [
  ["commissionAmount", "Commission"],
  ["sellerPayoutAmount", "Seller payout"],
] as const;

const ACCOUNTING_FIELDS = [
  ["platformRevenueAmount", "Platform revenue"],
  ["providerDeliveryFee", "Provider delivery cost"],
  ["deliveryMarkup", "Delivery markup"],
] as const;

type MoneyObject = Record<string, unknown>;

export function FinancialSummary({
  value,
  title = "Backend totals",
  compact = false,
}: {
  value: unknown;
  title?: string;
  compact?: boolean;
}) {
  const summaries = findMoneyObjects(value);
  if (!summaries.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg font-black">{title}</h3>
      {summaries.slice(0, compact ? 1 : 4).map((summary, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border bg-background p-4 text-foreground"
        >
          <MoneyRows fields={BUYER_FIELDS} source={summary} emphasize="totalAmount" />
          <MoneyRows fields={SELLER_FIELDS} source={summary} />
          <MoneyRows fields={ACCOUNTING_FIELDS} source={summary} />
        </div>
      ))}
    </div>
  );
}

function MoneyRows({
  fields,
  source,
  emphasize,
}: {
  fields: readonly (readonly [string, string])[];
  source: MoneyObject;
  emphasize?: string;
}) {
  const rows = fields.filter(([key]) => isMoney(source[key]));
  if (!rows.length) return null;
  return (
    <div className="space-y-2 border-b border-border py-2 last:border-b-0">
      {rows.map(([key, label]) => (
        <div key={key} className="flex items-center justify-between gap-4 text-sm">
          <span className={key === emphasize ? "font-bold" : "text-muted-foreground"}>{label}</span>
          <span
            className={
              key === emphasize ? "font-display text-lg font-black text-primary" : "font-semibold"
            }
          >
            {formatNGN(source[key] as number | string)}
          </span>
        </div>
      ))}
    </div>
  );
}

function findMoneyObjects(value: unknown): MoneyObject[] {
  const result: MoneyObject[] = [];
  const seen = new Set<unknown>();

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (hasMoneyFields(node as MoneyObject)) result.push(node as MoneyObject);
    if (Array.isArray(node)) node.forEach(visit);
    else Object.values(node as Record<string, unknown>).forEach(visit);
  };

  visit(value);
  return result;
}

function hasMoneyFields(value: MoneyObject) {
  return [...BUYER_FIELDS, ...SELLER_FIELDS, ...ACCOUNTING_FIELDS].some(([key]) =>
    isMoney(value[key]),
  );
}

function isMoney(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim() !== "" && Number.isFinite(Number(value));
  return false;
}
