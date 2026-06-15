import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { dispatchApi, paymentApi } from "@/lib/endpoints";
import { Button } from "@/components/ui/button";
import { CheckCircle2, PackageSearch, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { FinancialSummary } from "@/components/FinancialSummary";

type VerifySearch = {
  orderId?: string;
  reference?: string;
  trxref?: string;
};

export const Route = createFileRoute("/checkout/verify")({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    orderId: (search.orderId as string) || undefined,
    reference: (search.reference as string) || undefined,
    trxref: (search.trxref as string) || undefined,
  }),
  component: CheckoutVerifyPage,
});

function CheckoutVerifyPage() {
  const search = Route.useSearch();
  const pending = useMemo(readPendingCheckout, []);
  const [orderId, setOrderId] = useState(search.orderId ?? pending?.orderId ?? "");
  const [reference, setReference] = useState(
    search.reference ?? search.trxref ?? pending?.reference ?? "",
  );
  const [status, setStatus] = useState<"idle" | "verifying" | "verified" | "error">("idle");
  const [result, setResult] = useState<unknown>();
  const [shipment, setShipment] = useState<unknown>();

  useEffect(() => {
    if (orderId && reference) void verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async () => {
    if (!orderId || !reference) {
      toast.error("Order ID and Paystack reference are required");
      return;
    }
    setStatus("verifying");
    try {
      const response = await paymentApi.verifyOrder({ orderId, reference });
      setResult(response);
      setStatus("verified");
      localStorage.removeItem("afrab_checkout_pending");
      toast.success("Payment verified");
      await loadShipment(orderId);
    } catch (error: any) {
      setResult(error?.data ?? { message: error?.message ?? "Verification failed" });
      setStatus("error");
      toast.error(error?.message ?? "Verification failed");
    }
  };

  const loadShipment = async (id = orderId) => {
    if (!id) return;
    try {
      setShipment(await dispatchApi.shipment(id));
    } catch (error: any) {
      setShipment(error?.data ?? { message: error?.message ?? "Shipment is not ready yet" });
    }
  };

  const syncShipment = async () => {
    if (!orderId) return;
    try {
      const response = await dispatchApi.sync(orderId);
      setShipment(response);
      toast.success("Shipment synced");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not sync shipment");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            {status === "verified" ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <PackageSearch className="h-6 w-6" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Paystack checkout
            </p>
            <h1 className="font-display text-3xl font-black">Verify payment</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              After payment, Afra B confirms the Paystack reference, moves the order to processing,
              and creates or updates dispatch tracking.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <Field label="Order ID" value={orderId} onChange={setOrderId} />
          <Field label="Paystack reference" value={reference} onChange={setReference} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={verify} disabled={status === "verifying"}>
              {status === "verifying" ? "Verifying…" : "Verify payment"}
            </Button>
            <Button variant="outline" onClick={() => loadShipment()} disabled={!orderId}>
              Get shipment
            </Button>
            <Button variant="outline" onClick={syncShipment} disabled={!orderId}>
              <RefreshCw className="mr-2 h-4 w-4" /> Sync shipment
            </Button>
            <Link
              to="/account"
              className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium"
            >
              Account workbench
            </Link>
          </div>
        </div>
      </div>

      {(result || shipment) && (
        <div className="mt-6 grid gap-4">
          {result && <JsonPanel title="Verification response" value={result} />}
          {shipment && <JsonPanel title="Shipment response" value={shipment} />}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-input bg-background px-3 outline-none focus:border-primary"
      />
    </label>
  );
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="rounded-2xl border border-border bg-foreground p-4 text-background">
      <h2 className="mb-2 font-display text-lg font-black">{title}</h2>
      <FinancialSummary value={value} title="Financial summary" />
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}

function readPendingCheckout() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("afrab_checkout_pending") || "null") as {
      orderId?: string;
      reference?: string;
    } | null;
  } catch {
    return null;
  }
}
