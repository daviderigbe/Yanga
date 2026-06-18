import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { dispatchApi, paymentApi } from "@/lib/endpoints";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, PackageSearch, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { FinancialSummary } from "@/components/FinancialSummary";
import { notifyCartChanged } from "@/lib/cart-events";

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
  const hasPaymentDetails = Boolean(orderId && reference);

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
      notifyCartChanged();
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
        <div className="flex flex-col items-center text-center">
          <div
            className={`grid h-16 w-16 place-items-center rounded-full ${
              status === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            }`}
          >
            {status === "error" ? (
              <AlertCircle className="h-8 w-8" />
            ) : status === "verified" ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <PackageSearch className="h-8 w-8" />
            )}
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-primary">
            Checkout
          </p>
          <h1 className="mt-1 font-display text-3xl font-black">
            {status === "verified"
              ? "Payment confirmed"
              : status === "error"
                ? "Payment could not be confirmed"
                : status === "verifying"
                  ? "Confirming your payment"
                  : "Complete your payment confirmation"}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            {status === "verified"
              ? "Your order is now processing. We will update delivery tracking as soon as pickup is ready."
              : status === "error"
                ? "We could not confirm this payment yet. Please check the details below or try again."
                : status === "verifying"
                  ? "This usually takes a few seconds."
                  : "Enter the order details from your checkout if they were not filled automatically."}
          </p>
        </div>

        {!hasPaymentDetails && (
          <div className="mt-6 grid gap-3">
            <Field label="Order ID" value={orderId} onChange={setOrderId} />
            <Field label="Paystack reference" value={reference} onChange={setReference} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {(!hasPaymentDetails || status === "error") && (
            <Button onClick={verify} disabled={status === "verifying"}>
              {status === "verifying" ? "Confirming…" : "Confirm payment"}
            </Button>
          )}
          {status === "verified" && (
            <Button variant="outline" onClick={syncShipment} disabled={!orderId}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh delivery
            </Button>
          )}
          <Link
            to="/account"
            search={{ tab: "orders" } as any}
            className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium"
          >
            View orders
          </Link>
          <Link
            to="/search"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Continue shopping
          </Link>
        </div>
      </div>

      {(result || shipment) && (
        <div className="mt-6 grid gap-4">
          {result && (
            <DetailsPanel title="Payment details" value={result} fallbackReference={reference} />
          )}
          {shipment && <DetailsPanel title="Delivery details" value={shipment} />}
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

function DetailsPanel({
  title,
  value,
  fallbackReference,
}: {
  title: string;
  value: any;
  fallbackReference?: string;
}) {
  const data = value?.data ?? value;
  const shipment = data?.shipment ?? data;
  const isDelivery = title.toLowerCase().includes("delivery");
  const trackingUrl = firstDefined(
    shipment?.trackingUrl,
    shipment?.tracking_url,
    data?.trackingUrl,
    data?.tracking_url,
  );
  const reference = firstDefined(
    data?.reference,
    data?.paymentReference,
    data?.paystack?.reference,
    data?.payment?.reference,
    fallbackReference,
  );
  const trackingId = firstDefined(
    shipment?.trackingId,
    shipment?.trackingID,
    shipment?.trackingNumber,
    shipment?.trackingNo,
    shipment?.kwikTrackingId,
    shipment?.kwikTaskId,
    shipment?.taskId,
    data?.trackingId,
    data?.trackingNumber,
    trackingIdFromUrl(trackingUrl),
  );
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <h2 className="mb-2 font-display text-lg font-black">{title}</h2>
      <FinancialSummary value={value} title={isDelivery ? "Delivery summary" : "Payment summary"} />
      <dl className="mt-3 grid gap-2 text-sm">
        <Detail
          label="Status"
          value={data?.order?.status ?? shipment?.status ?? data?.status ?? "Pending"}
        />
        {!isDelivery && reference && <Detail label="Reference" value={reference} />}
        {isDelivery && trackingId && <Detail label="Tracking ID" value={trackingId} />}
      </dl>
      {trackingUrl && (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Track delivery
        </a>
      )}
    </section>
  );
}

function firstDefined<T>(...values: T[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function trackingIdFromUrl(value?: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return (
      url.searchParams.get("jobID") ??
      url.searchParams.get("jobId") ??
      url.searchParams.get("trackingId") ??
      undefined
    );
  } catch {
    return undefined;
  }
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
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
