import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { addressApi, dispatchApi, historyApi, paymentApi, uploadApi, userApi } from "@/lib/endpoints";
import { formatNGN, unwrapItems } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FinancialSummary } from "@/components/FinancialSummary";
import { toast } from "sonner";
import {
  Banknote,
  Camera,
  ChevronDown,
  Eye,
  EyeOff,
  Home,
  MapPin,
  Package,
  Receipt,
  Settings,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";

type Tab = "overview" | "addresses" | "orders" | "wallet" | "seller" | "settings";

export const Route = createFileRoute("/account")({
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => ({
    tab: isTab(search.tab) ? search.tab : undefined,
  }),
  component: AccountPage,
});

interface Address {
  id: string;
  type?: string;
  street?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  contactName?: string;
  contactPhone?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

interface OrderLike {
  id?: string;
  orderId?: string;
  status?: string;
  shipmentStatus?: string;
  totalAmount?: number | string;
  sellerPayoutAmount?: number | string;
  commissionAmount?: number | string;
  createdAt?: string;
  [key: string]: unknown;
}

interface WithdrawalLike {
  id?: string;
  reference?: string;
  transferCode?: string;
  amount?: number | string;
  amountKobo?: number | string;
  status?: string;
  bankName?: string;
  accountNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BankOption {
  name: string;
  code: string;
  slug?: string;
}

interface SavedBankDetails {
  accountNumber?: string;
  bankCode?: string;
  bankName?: string;
  accountName?: string;
}

const emptyAddress = {
  type: "SHIPPING",
  address: "",
  city: "",
  state: "Lagos",
  country: "Nigeria",
  zipCode: "",
  contactName: "",
  contactPhone: "",
  landmark: "",
  deliveryInstructions: "",
  latitude: "",
  longitude: "",
  isDefault: false,
};

const emptyBankDetails = {
  accountNumber: "",
  bankCode: "",
  bankName: "",
  accountName: "",
};

function isTab(value: unknown): value is Tab {
  return (
    value === "overview" ||
    value === "addresses" ||
    value === "orders" ||
    value === "wallet" ||
    value === "seller" ||
    value === "settings"
  );
}

function extractOrders(response: unknown): OrderLike[] {
  const data = (response as any)?.data ?? response;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.purchases)) return data.purchases;
  if (Array.isArray(data?.sales)) return data.sales;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.orders)) return data.data.orders;
  if (Array.isArray(data?.data?.purchases)) return data.data.purchases;
  if (Array.isArray(data?.data?.sales)) return data.data.sales;
  return [];
}

function extractItems<T>(response: unknown, keys: string[] = []): T[] {
  const data = (response as any)?.data ?? response;
  if (Array.isArray(data)) return data;
  for (const key of ["items", ...keys]) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function extractBanks(response: unknown): BankOption[] {
  return extractItems<any>(response, ["banks", "data", "items"])
    .map((bank) => ({
      name: String(bank?.name ?? bank?.bankName ?? ""),
      code: String(bank?.code ?? bank?.bankCode ?? ""),
      slug: bank?.slug ? String(bank.slug) : undefined,
    }))
    .filter((bank) => bank.name && bank.code);
}

function extractBankDetails(response: unknown): SavedBankDetails | null {
  const data = (response as any)?.data ?? response;
  const bank =
    data?.bankDetails ??
    data?.bankDetail ??
    data?.payoutBank ??
    data?.bank ??
    data?.user?.bankDetails ??
    data?.data?.bankDetails ??
    data;
  if (!bank || typeof bank !== "object") return null;
  const details = {
    accountNumber: stringOrUndefined(bank.accountNumber ?? bank.account_number),
    bankCode: stringOrUndefined(bank.bankCode ?? bank.bank_code ?? bank.code),
    bankName: stringOrUndefined(bank.bankName ?? bank.bank_name ?? bank.name),
    accountName: stringOrUndefined(bank.accountName ?? bank.account_name),
  };
  return details.accountNumber || details.bankName || details.accountName ? details : null;
}

function stringOrUndefined(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

async function resolveAccountName({
  bankDetails,
  setResolving,
  onResolved,
}: {
  bankDetails: {
    accountNumber: string;
    bankCode: string;
    bankName?: string;
  };
  setResolving: (value: boolean) => void;
  onResolved: (accountName: string) => void;
}) {
  const accountNumber = bankDetails.accountNumber.trim();
  if (!/^\d{10}$/.test(accountNumber)) {
    toast.error("Enter a valid 10-digit account number");
    return;
  }
  if (!bankDetails.bankCode && !bankDetails.bankName) {
    toast.error("Select a bank first");
    return;
  }
  setResolving(true);
  try {
    const response = await paymentApi.resolveBank({
      accountNumber,
      bankCode: bankDetails.bankCode,
      bankName: bankDetails.bankName,
    });
    const accountName = resolvedAccountName(response);
    if (!accountName) throw new Error("Account name was not returned");
    onResolved(accountName);
    toast.success("Account name resolved");
  } catch (error: any) {
    toast.error(error.message ?? "Could not resolve account name");
  } finally {
    setResolving(false);
  }
}

function resolvedAccountName(response: unknown) {
  const data = (response as any)?.data ?? response;
  return (
    data?.accountName ??
    data?.account_name ??
    data?.account?.accountName ??
    data?.account?.account_name ??
    data?.details?.accountName ??
    data?.details?.account_name ??
    data?.data?.accountName ??
    data?.data?.account_name
  );
}

async function enrichOrders(orders: OrderLike[]) {
  const enriched = await Promise.all(
    orders.map(async (order) => {
      if (orderImage(order) || orderTitle(order)) return order;
      const id = order.id ?? order.orderId;
      if (!id) return order;
      try {
        const detail = await paymentApi.order(String(id));
        return mergeOrderDetail(order, detail);
      } catch {
        return order;
      }
    }),
  );
  return enriched;
}

function mergeOrderDetail(order: OrderLike, detail: unknown): OrderLike {
  const data = (detail as any)?.data ?? detail;
  return {
    ...order,
    detail: data,
    order: (data as any)?.order ?? (order as any).order,
    shipment: (data as any)?.shipment ?? (order as any).shipment,
    items:
      (data as any)?.items ??
      (data as any)?.order?.items ??
      (data as any)?.orderItems ??
      (order as any).items,
  };
}

function AccountPage() {
  const { user, loading, refresh: refreshAuth } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(search.tab ?? "overview");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [purchases, setPurchases] = useState<OrderLike[]>([]);
  const [sales, setSales] = useState<OrderLike[]>([]);
  const [wallet, setWallet] = useState<any>();
  const [savedBank, setSavedBank] = useState<SavedBankDetails | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const [addressRes, purchaseRes, salesRes, walletRes, bankRes] = await Promise.allSettled([
        addressApi.list(),
        historyApi.purchases({ limit: 50 }),
        historyApi.sales({ limit: 50 }),
        paymentApi.walletBalance(user.id),
        userApi.bankDetails(),
      ]);
      if (addressRes.status === "fulfilled")
        setAddresses(unwrapItems<Address>(addressRes.value as any));
      if (purchaseRes.status === "fulfilled") {
        const nextPurchases = extractOrders(purchaseRes.value);
        setPurchases(await enrichOrders(nextPurchases));
      }
      if (salesRes.status === "fulfilled") {
        const nextSales = extractOrders(salesRes.value);
        setSales(await enrichOrders(nextSales));
      }
      if (walletRes.status === "fulfilled")
        setWallet((walletRes.value as any)?.data ?? walletRes.value);
      if (bankRes.status === "fulfilled") setSavedBank(extractBankDetails(bankRes.value));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (search.tab) setTab(search.tab);
  }, [search.tab]);

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">
        Loading account…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">My Yanga</p>
          <h1 className="font-display text-3xl font-black md:text-4xl">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={refresh} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
        <TabButton tab="overview" active={tab} setTab={setTab} icon={UserRound} label="Overview" />
        <TabButton tab="addresses" active={tab} setTab={setTab} icon={Home} label="Addresses" />
        <TabButton tab="orders" active={tab} setTab={setTab} icon={Receipt} label="Orders" />
        <TabButton tab="wallet" active={tab} setTab={setTab} icon={Wallet} label="Wallet" />
        <TabButton tab="seller" active={tab} setTab={setTab} icon={Package} label="Seller" />
        <TabButton tab="settings" active={tab} setTab={setTab} icon={Settings} label="Settings" />
      </div>

      {tab === "overview" && (
        <Overview
          name={user.name}
          wallet={wallet}
          addressCount={addresses.length}
          purchaseCount={purchases.length}
          salesCount={sales.length}
        />
      )}
      {tab === "addresses" && <Addresses addresses={addresses} onChanged={refresh} />}
      {tab === "orders" && <Orders purchases={purchases} sales={sales} />}
      {tab === "wallet" && (
        <WalletPanel userId={user.id} wallet={wallet} savedBank={savedBank} onChanged={refresh} />
      )}
      {tab === "seller" && (
        <Seller addresses={addresses} userId={user.id} savedBank={savedBank} onChanged={refresh} />
      )}
      {tab === "settings" && (
        <SettingsPanel
          user={user}
          onProfileUpdated={refreshAuth}
        />
      )}
    </div>
  );
}

function Overview({
  name,
  wallet,
  addressCount,
  purchaseCount,
  salesCount,
}: {
  name: string;
  wallet: any;
  addressCount: number;
  purchaseCount: number;
  salesCount: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Metric icon={UserRound} label="Welcome" value={name} />
      <Metric icon={Home} label="Saved addresses" value={addressCount} />
      <Metric icon={Truck} label="Purchases" value={purchaseCount} />
      <Metric icon={Banknote} label="Sales" value={salesCount} />
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:col-span-2">
        <div className="mb-2 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-black">Wallet</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Seller payouts appear here after delivery is completed.
        </p>
        <FinancialSummary value={wallet} title="Wallet totals" compact />
      </div>
    </div>
  );
}

function WalletPanel({
  userId,
  wallet,
  savedBank,
  onChanged,
}: {
  userId: string;
  wallet: any;
  savedBank: SavedBankDetails | null;
  onChanged: () => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [withdrawMode, setWithdrawMode] = useState<"saved" | "specific">("saved");
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [bankDetails, setBankDetails] = useState(emptyBankDetails);
  const [withdrawing, setWithdrawing] = useState(false);
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WithdrawalLike[]>([]);
  const available = walletAmount(wallet);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await paymentApi.withdrawalHistory(userId, { page: 1, limit: 10 });
      setWithdrawals(extractItems<WithdrawalLike>(response, ["withdrawals", "history", "records"]));
    } catch {
      setWithdrawals([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    paymentApi
      .banks()
      .then((response) => setBanks(extractBanks(response)))
      .catch(() => setBanks([]));
  }, []);

  const withdraw = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 100) {
      toast.error("Minimum withdrawal is ₦100");
      return;
    }
    if (available !== undefined && value > available) {
      toast.error("Withdrawal amount is higher than your available balance");
      return;
    }
    if (withdrawMode === "specific" && (!bankDetails.accountNumber || !bankDetails.bankCode)) {
      toast.error("Select a bank and enter the account number");
      return;
    }
    if (withdrawMode === "saved" && !hasBankDetails(savedBank)) {
      toast.error("Add your saved payout bank from the Seller tab first");
      return;
    }
    setWithdrawing(true);
    try {
      if (withdrawMode === "specific") {
        await paymentApi.withdraw({
          userId,
          amount: value,
          bankDetails: clean(bankDetails),
        });
      } else {
        await paymentApi.withdrawSaved({ userId, amount: value });
      }
      toast.success("Withdrawal requested");
      setAmount("");
      if (withdrawMode === "specific") setBankDetails({ ...emptyBankDetails });
      await Promise.all([onChanged(), loadHistory()]);
    } catch (error: any) {
      toast.error(error.message ?? "Could not request withdrawal");
    } finally {
      setWithdrawing(false);
    }
  };

  const resolveWithdrawalAccount = async () => {
    await resolveAccountName({
      bankDetails,
      setResolving: setResolvingAccount,
      onResolved: (accountName) =>
        setBankDetails((current) => ({
          ...current,
          accountName,
        })),
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <section className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-black">Seller wallet</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Available seller payouts can be withdrawn to your saved payout bank.
          </p>
          <p className="mt-5 font-display text-4xl font-black text-primary">
            {formatNGN(available ?? 0)}
          </p>
          <FinancialSummary value={wallet} title="Wallet totals" compact />
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <SectionTitle title="Withdrawal history" sub="Recent payout requests." />
          <div className="mt-4 space-y-3">
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">Loading withdrawals…</p>
            ) : withdrawals.length ? (
              withdrawals.map((withdrawal, index) => (
                <WithdrawalCard
                  key={withdrawal.id ?? withdrawal.reference ?? index}
                  value={withdrawal}
                />
              ))
            ) : (
              <EmptyState text="No withdrawals yet." />
            )}
          </div>
        </section>
      </section>

      <section className="h-fit rounded-2xl border border-border bg-card p-5 shadow-card">
        <SectionTitle title="Withdraw funds" sub="Use a saved bank or enter another account." />
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 rounded-full bg-secondary p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setWithdrawMode("saved")}
              className={`rounded-full py-2 transition ${
                withdrawMode === "saved"
                  ? "bg-background text-foreground shadow-soft"
                  : "text-muted-foreground"
              }`}
            >
              Saved bank
            </button>
            <button
              type="button"
              onClick={() => setWithdrawMode("specific")}
              className={`rounded-full py-2 transition ${
                withdrawMode === "specific"
                  ? "bg-background text-foreground shadow-soft"
                  : "text-muted-foreground"
              }`}
            >
              Other bank
            </button>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Amount</span>
            <input
              type="number"
              min={100}
              step={100}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 outline-none focus:border-primary"
              placeholder="1000"
            />
          </label>
          {withdrawMode === "saved" && <SavedBankCard bank={savedBank} />}
          {withdrawMode === "specific" && (
            <>
              <BankPicker
                banks={banks}
                selectedCode={bankDetails.bankCode}
                onSelect={(bank) =>
                  setBankDetails((current) => ({
                    ...current,
                    bankCode: bank.code,
                    bankName: bank.name,
                  }))
                }
              />
              <Field
                label="Account number"
                value={bankDetails.accountNumber}
                onChange={(accountNumber) =>
                  setBankDetails((current) => ({ ...current, accountNumber }))
                }
              />
              <Field
                label="Account name"
                value={bankDetails.accountName}
                onChange={(accountName) =>
                  setBankDetails((current) => ({ ...current, accountName }))
                }
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={resolveWithdrawalAccount}
                disabled={resolvingAccount}
              >
                {resolvingAccount ? "Resolving…" : "Resolve account name"}
              </Button>
            </>
          )}
          <Button className="rounded-full" onClick={withdraw} disabled={withdrawing}>
            {withdrawing
              ? "Requesting…"
              : withdrawMode === "specific"
                ? "Withdraw to this account"
                : "Withdraw to saved bank"}
          </Button>
          {withdrawMode === "saved" && (
            <p className="text-xs text-muted-foreground">
              Add or update your saved payout bank from the Seller tab before withdrawing.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Addresses({
  addresses,
  onChanged,
}: {
  addresses: Address[];
  onChanged: () => Promise<void>;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <section className="space-y-3">
        <SectionTitle
          title="Saved addresses"
          sub="Use shipping addresses for checkout and pickup addresses for selling."
        />
        {addresses.length ? (
          addresses.map((address) => (
            <AddressCard key={address.id} address={address} onChanged={onChanged} />
          ))
        ) : (
          <EmptyState text="No saved addresses yet." />
        )}
      </section>
      <AddressForm title="Add address" initial={emptyAddress} onSaved={onChanged} />
    </div>
  );
}

function Seller({
  addresses,
  userId,
  savedBank,
  onChanged,
}: {
  addresses: Address[];
  userId: string;
  savedBank: SavedBankDetails | null;
  onChanged: () => Promise<void>;
}) {
  const pickup = addresses.find((address) => address.type === "PICKUP");
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [bank, setBank] = useState(emptyBankDetails);
  const [resolvingAccount, setResolvingAccount] = useState(false);

  useEffect(() => {
    paymentApi
      .banks()
      .then((response) => setBanks(extractBanks(response)))
      .catch(() => setBanks([]));
  }, []);

  const saveBank = async () => {
    try {
      if (!bank.bankCode || !bank.accountNumber) {
        toast.error("Select a bank and enter the account number");
        return;
      }
      await userApi.saveBankDetails(clean(bank));
      toast.success("Bank details saved");
      await onChanged();
      setBank({ ...emptyBankDetails });
    } catch (error: any) {
      toast.error(error.message ?? "Could not save bank details");
    }
  };

  const resolvePayoutAccount = async () => {
    await resolveAccountName({
      bankDetails: bank,
      setResolving: setResolvingAccount,
      onResolved: (accountName) =>
        setBank((current) => ({
          ...current,
          accountName,
        })),
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <section className="space-y-4">
        <SectionTitle
          title="Seller setup"
          sub="A Lagos pickup address is required before buyers can checkout your items."
        />
        {pickup ? (
          <AddressCard address={pickup} onChanged={onChanged} />
        ) : (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            Add a pickup address with contact phone, latitude, and longitude. Without it, checkout
            can fail for buyers.
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-black">Payout bank</h3>
          </div>
          <SavedBankCard bank={savedBank} />
          <div className="grid gap-3">
            <BankPicker
              banks={banks}
              selectedCode={bank.bankCode}
              onSelect={(selectedBank) =>
                setBank((current) => ({
                  ...current,
                  bankCode: selectedBank.code,
                  bankName: selectedBank.name,
                }))
              }
            />
            <Field
              label="Account number"
              value={bank.accountNumber}
              onChange={(accountNumber) => setBank({ ...bank, accountNumber })}
            />
            <Field
              label="Account name"
              value={bank.accountName}
              onChange={(accountName) => setBank({ ...bank, accountName })}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={resolvePayoutAccount}
              disabled={resolvingAccount}
            >
              {resolvingAccount ? "Resolving…" : "Resolve account name"}
            </Button>
            <Button className="rounded-full" onClick={saveBank}>
              Save payout details
            </Button>
          </div>
        </div>
      </section>
      <AddressForm
        key={pickup?.id ?? "new-pickup"}
        title={pickup ? "Update pickup address" : "Add pickup address"}
        initial={
          pickup
            ? addressToForm(pickup)
            : {
                ...emptyAddress,
                type: "PICKUP",
                state: "Lagos",
                contactName: "",
                contactPhone: "",
              }
        }
        addressId={pickup?.id}
        onSaved={onChanged}
      />
      <p className="hidden">{userId}</p>
    </div>
  );
}

function SettingsPanel({
  user,
  onProfileUpdated,
}: {
  user: { id: string; name: string; userName?: string; bio?: string; imageUrl?: string };
  onProfileUpdated: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: user.name ?? "",
    username: user.userName ?? "",
    bio: user.bio ?? "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user.imageUrl ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      let imageUrl = user.imageUrl;
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        formData.append("folder", "avatars");
        const uploadResponse = await uploadApi.single(formData);
        imageUrl = extractUploadUrl(uploadResponse) ?? imageUrl;
      }
      await userApi.editProfile(user.id, {
        name: form.name.trim(),
        username: form.username.trim(),
        bio: form.bio.trim(),
        image: imageUrl,
      });
      toast.success("Profile updated");
      setAvatarFile(null);
      await onProfileUpdated();
    } catch (error: any) {
      toast.error(error.message ?? "Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <SectionTitle title="Profile" sub="Update how you appear to buyers and sellers." />
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-primary/10 text-xl font-bold text-primary">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  (form.name?.[0]?.toUpperCase() ?? "?")
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-soft">
                <Camera className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Tap the camera to change your photo.</p>
          </div>
          <Field
            label="Full name"
            value={form.name}
            onChange={(name) => setForm((current) => ({ ...current, name }))}
          />
          <Field
            label="Username"
            value={form.username}
            onChange={(username) => setForm((current) => ({ ...current, username }))}
          />
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Bio</span>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(event) =>
                setForm((current) => ({ ...current, bio: event.target.value }))
              }
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Tell buyers about your style"
            />
          </label>
          <Button className="rounded-full" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </section>

      <ChangePasswordCard userId={user.id} />
    </div>
  );
}

function ChangePasswordCard({ userId }: { userId: string }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await userApi.changePassword(userId, { oldPassword, newPassword });
      toast.success("Password updated");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message ?? "Could not update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <SectionTitle title="Password" sub="Use a strong password you don't use anywhere else." />
      <form onSubmit={submit} className="mt-4 space-y-4">
        <PasswordField
          label="Current password"
          value={oldPassword}
          onChange={setOldPassword}
          show={show}
          onToggle={() => setShow((value) => !value)}
        />
        <PasswordField
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          show={show}
          onToggle={() => setShow((value) => !value)}
        />
        <PasswordField
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={show}
          onToggle={() => setShow((value) => !value)}
        />
        <Button className="rounded-full" disabled={saving}>
          {saving ? "Updating…" : "Update password"}
        </Button>
      </form>
    </section>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-xl border border-input bg-background px-3 pr-10 outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </label>
  );
}

function extractUploadUrl(response: any): string | undefined {
  const data = response?.data ?? response;
  return (
    data?.url ??
    data?.fileUrl ??
    data?.location ??
    data?.urls?.[0] ??
    data?.files?.[0]?.url ??
    data?.files?.[0]
  );
}

function Orders({ purchases, sales }: { purchases: OrderLike[]; sales: OrderLike[] }) {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<any>();
  const [shipment, setShipment] = useState<any>();

  const loadOrder = async () => {
    if (!orderId) return;
    try {
      setOrder(await paymentApi.order(orderId));
    } catch (error: any) {
      toast.error(error.message ?? "Could not load order");
    }
  };

  const loadShipment = async () => {
    if (!orderId) return;
    try {
      setShipment(await dispatchApi.shipment(orderId));
    } catch (error: any) {
      toast.error(error.message ?? "Shipment not available yet");
    }
  };

  const syncShipment = async () => {
    if (!orderId) return;
    try {
      setShipment(await dispatchApi.sync(orderId));
      toast.success("Shipment updated");
    } catch (error: any) {
      toast.error(error.message ?? "Could not sync shipment");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <OrderList title="Purchases" orders={purchases} empty="No purchases yet." />
      <OrderList title="Sales" orders={sales} empty="No sales yet." seller />
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card xl:col-span-2">
        <SectionTitle title="Track an order" sub="Check payment and delivery status." />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            placeholder="Order ID"
            className="h-11 flex-1 rounded-xl border border-input bg-background px-3 outline-none focus:border-primary"
          />
          <Button onClick={loadOrder}>Load order</Button>
          <Button variant="outline" onClick={loadShipment}>
            Shipment
          </Button>
          <Button variant="outline" onClick={syncShipment}>
            Sync
          </Button>
        </div>
        {(order || shipment) && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {order && <OrderDetail title="Order" value={order} />}
            {shipment && <OrderDetail title="Shipment" value={shipment} />}
          </div>
        )}
      </section>
    </div>
  );
}

function AddressForm({
  title,
  initial,
  addressId,
  onSaved,
}: {
  title: string;
  initial: typeof emptyAddress;
  addressId?: string;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = prepareAddressPayload(form);
      const isUpdate = Boolean(addressId);
      if (isUpdate) await addressApi.update(addressId, payload);
      else await addressApi.create(payload);
      toast.success("Address saved");
      if (!isUpdate) setForm({ ...initial });
      await onSaved();
    } catch (error: any) {
      toast.error(error.message ?? "Could not save address");
    } finally {
      setSaving(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported by this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        if (!isLikelyLagosCoordinate(latitude, longitude)) {
          toast.error("This location does not look like Lagos");
          setLocating(false);
          return;
        }
        setForm((current) => ({
          ...current,
          state: "Lagos",
          country: "Nigeria",
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }));
        toast.success("Coordinates added");
        setLocating(false);
      },
      () => {
        toast.error("Could not get your current location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const findCoordinatesFromAddress = async () => {
    const query = [form.address, form.city, form.state || "Lagos", form.country || "Nigeria"]
      .filter(Boolean)
      .join(", ");
    if (!form.address || !form.city) {
      toast.error("Enter street address and city first");
      return;
    }
    setLocating(true);
    try {
      const params = new URLSearchParams({
        q: query,
        format: "jsonv2",
        addressdetails: "1",
        countrycodes: "ng",
        limit: "5",
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      if (!response.ok) throw new Error("Could not find coordinates");
      const results = (await response.json()) as Array<{
        lat?: string;
        lon?: string;
        display_name?: string;
      }>;
      const result =
        results.find((item) => item.display_name?.toLowerCase().includes("lagos")) ?? results[0];
      const latitude = Number(result?.lat);
      const longitude = Number(result?.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("No coordinates found for this address");
      }
      if (!isLikelyLagosCoordinate(latitude, longitude)) {
        throw new Error("The matched address does not look like Lagos");
      }
      setForm((current) => ({
        ...current,
        state: "Lagos",
        country: "Nigeria",
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
      }));
      toast.success("Coordinates found");
    } catch (error: any) {
      toast.error(error.message ?? "Could not find coordinates");
    } finally {
      setLocating(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-display text-xl font-black">{title}</h2>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Type</span>
          <select
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
            className="h-10 rounded-xl border border-input bg-background px-3 outline-none focus:border-primary"
          >
            <option value="SHIPPING">Shipping</option>
            <option value="PICKUP">Pickup</option>
            <option value="BILLING">Billing</option>
          </select>
        </label>
        <Field
          label="Street address"
          value={form.address}
          onChange={(address) => setForm({ ...form, address })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="City" value={form.city} onChange={(city) => setForm({ ...form, city })} />
          <Field
            label="State"
            value={form.state}
            onChange={(state) => setForm({ ...form, state })}
          />
        </div>
        <Field
          label="Contact name"
          value={form.contactName}
          onChange={(contactName) => setForm({ ...form, contactName })}
        />
        <Field
          label="Contact phone"
          value={form.contactPhone}
          onChange={(contactPhone) => setForm({ ...form, contactPhone })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Latitude"
            value={form.latitude}
            onChange={(latitude) => setForm({ ...form, latitude })}
          />
          <Field
            label="Longitude"
            value={form.longitude}
            onChange={(longitude) => setForm({ ...form, longitude })}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={findCoordinatesFromAddress}
            disabled={locating}
          >
            {locating ? "Finding…" : "Find coordinates"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={useCurrentLocation}
            disabled={locating}
          >
            Use current location
          </Button>
        </div>
        <Field
          label="Landmark"
          value={form.landmark}
          onChange={(landmark) => setForm({ ...form, landmark })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(event) => setForm({ ...form, isDefault: event.target.checked })}
          />
          Set as default
        </label>
        {requiresDeliveryDetails(form.type) && (
          <p className="rounded-xl bg-secondary/70 p-3 text-xs text-muted-foreground">
            Lagos delivery requires contact phone plus latitude and longitude. Use the coordinate
            buttons to fill them automatically.
          </p>
        )}
        <Button className="rounded-full" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save address"}
        </Button>
      </div>
    </section>
  );
}

function AddressCard({ address, onChanged }: { address: Address; onChanged: () => Promise<void> }) {
  const remove = async () => {
    try {
      await addressApi.delete(address.id);
      toast.success("Address deleted");
      await onChanged();
    } catch (error: any) {
      toast.error(error.message ?? "Could not delete address");
    }
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">
            {address.type ?? "Address"}
          </span>
          <h3 className="mt-3 font-semibold">{addressLabel(address)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {address.contactName} {address.contactPhone && `· ${address.contactPhone}`}
          </p>
          {address.type === "PICKUP" && (!address.latitude || !address.longitude) && (
            <p className="mt-2 text-xs font-semibold text-destructive">
              Pickup needs latitude and longitude.
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={remove}>
          Delete
        </Button>
      </div>
    </article>
  );
}

function OrderList({
  title,
  orders,
  empty,
  seller,
}: {
  title: string;
  orders: OrderLike[];
  empty: string;
  seller?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <SectionTitle title={title} />
      <div className="mt-4 space-y-3">
        {orders.length ? (
          orders.map((order, index) => (
            <OrderCard key={order.id ?? order.orderId ?? index} order={order} seller={seller} />
          ))
        ) : (
          <EmptyState text={empty} />
        )}
      </div>
    </section>
  );
}

function OrderCard({ order, seller }: { order: OrderLike; seller?: boolean }) {
  const image = orderImage(order);
  const title = orderTitle(order);
  const status = displayOrderStatus(order);
  const total = seller ? (sellerPayout(order) ?? orderTotal(order)) : orderTotal(order);
  return (
    <article className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-start gap-3">
        <div className="h-16 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
          {image ? (
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-[10px] text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title ?? order.id ?? order.orderId ?? "Order"}</p>
          {title && (
            <p className="truncate text-xs text-muted-foreground">
              {order.id ?? order.orderId ?? "Order"}
            </p>
          )}
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{status}</p>
        </div>
        {total !== undefined && (
          <span className="flex-shrink-0 font-display font-black text-primary">
            {formatNGN(total)}
          </span>
        )}
      </div>
      {seller && (
        <div className="mt-3">
          <FinancialSummary value={order} title="Seller payout" compact mode="seller" />
        </div>
      )}
    </article>
  );
}

function OrderDetail({ title, value }: { title: string; value: any }) {
  const data = value?.data ?? value;
  const orderStatus = detailOrderStatus(data);
  const shipmentStatus = detailShipmentStatus(data);
  const trackingUrl = detailTrackingUrl(data);
  return (
    <article className="rounded-2xl border border-border bg-background p-4">
      <h3 className="font-display text-lg font-black">{title}</h3>
      <FinancialSummary value={data} title="Totals" compact />
      <dl className="mt-3 grid gap-2 text-sm">
        {orderStatus && <Row label="Status" value={orderStatus} />}
        {shipmentStatus && <Row label="Shipment" value={shipmentStatus} />}
        {trackingUrl && (
          <a
            className="font-semibold text-primary hover:underline"
            href={trackingUrl}
            target="_blank"
            rel="noreferrer"
          >
            Track delivery
          </a>
        )}
      </dl>
    </article>
  );
}

function orderImage(order: OrderLike) {
  const product = firstOrderProduct(order);
  const images = product?.images ?? product?.productImages;
  if (Array.isArray(images)) {
    const first = images[0];
    if (typeof first === "string") return first;
    return first?.url ?? first?.imageUrl ?? first?.src;
  }
  return (
    product?.imageUrl ??
    product?.image ??
    product?.thumbnailUrl ??
    product?.thumbnail ??
    (order as any).imageUrl
  );
}

function orderTitle(order: OrderLike) {
  const product = firstOrderProduct(order);
  const item = firstOrderItem(order);
  return (
    product?.title ??
    product?.name ??
    item?.productTitle ??
    item?.title ??
    (order as any).productTitle
  );
}

function orderTotal(order: OrderLike) {
  return firstMoney(
    order.totalAmount,
    (order as any).amount,
    (order as any).order?.totalAmount,
    (order as any).detail?.totalAmount,
    (order as any).detail?.order?.totalAmount,
  );
}

function sellerPayout(order: OrderLike) {
  return firstMoney(
    order.sellerPayoutAmount,
    (order as any).sellerPayout,
    (order as any).payoutAmount,
    (order as any).order?.sellerPayoutAmount,
    (order as any).detail?.sellerPayoutAmount,
    (order as any).detail?.order?.sellerPayoutAmount,
  );
}

function displayOrderStatus(order: OrderLike) {
  return (
    firstUsefulStatus(
      (order as any).order?.status,
      order.status,
      order.shipmentStatus,
      (order as any).shipment?.status,
      (order as any).detail?.order?.status,
      (order as any).detail?.shipment?.status,
    ) ?? "Pending"
  );
}

function detailOrderStatus(data: any) {
  return firstUsefulStatus(data?.order?.status, data?.status, data?.paymentStatus);
}

function detailShipmentStatus(data: any) {
  return firstUsefulStatus(
    data?.shipment?.status,
    data?.order?.shipmentStatus,
    data?.shipmentStatus,
    data?.dispatch?.status,
  );
}

function detailTrackingUrl(data: any) {
  return (
    data?.shipment?.trackingUrl ??
    data?.shipment?.tracking_url ??
    data?.trackingUrl ??
    data?.tracking_url ??
    data?.order?.trackingUrl ??
    data?.dispatch?.trackingUrl
  );
}

function firstOrderProduct(order: OrderLike) {
  const item = firstOrderItem(order);
  return item?.product ?? item?.Product ?? (order as any).product ?? (order as any).detail?.product;
}

function firstOrderItem(order: OrderLike) {
  const candidates = [
    (order as any).items,
    (order as any).orderItems,
    (order as any).lineItems,
    (order as any).order?.items,
    (order as any).detail?.items,
    (order as any).detail?.orderItems,
    (order as any).detail?.order?.items,
  ];
  const items = candidates.find(Array.isArray);
  return items?.[0];
}

function firstUsefulStatus(...values: unknown[]) {
  return values.find(
    (value) =>
      typeof value === "string" &&
      value.trim() !== "" &&
      !["success", "error"].includes(value.toLowerCase()),
  ) as string | undefined;
}

function firstMoney(...values: unknown[]) {
  return values.find(
    (value) =>
      (typeof value === "number" && Number.isFinite(value)) ||
      (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))),
  ) as number | string | undefined;
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <Icon className="mb-4 h-5 w-5 text-primary" />
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-black">{value}</p>
    </div>
  );
}

function WithdrawalCard({ value }: { value: WithdrawalLike }) {
  const amount = withdrawalAmount(value);
  return (
    <article className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{value.status ?? "Withdrawal"}</p>
          <p className="text-xs text-muted-foreground">
            {value.bankName ?? "Saved bank"} {value.accountNumber && `· ${value.accountNumber}`}
          </p>
          {(value.createdAt || value.updatedAt) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(value.createdAt ?? value.updatedAt)}
            </p>
          )}
        </div>
        <span className="font-display font-black text-primary">{formatNGN(amount)}</span>
      </div>
    </article>
  );
}

function walletAmount(wallet: any) {
  const data = wallet?.data ?? wallet;
  const candidates = [
    data?.availableBalance,
    data?.balance,
    data?.walletBalance,
    data?.amount,
    data?.currentBalance,
    data?.wallet?.availableBalance,
    data?.wallet?.balance,
  ];
  return numberFrom(candidates.find((value) => numberFrom(value) !== undefined));
}

function withdrawalAmount(withdrawal: WithdrawalLike) {
  const amount = numberFrom(withdrawal.amount);
  if (amount !== undefined) return amount;
  const kobo = numberFrom(withdrawal.amountKobo);
  return kobo !== undefined ? kobo / 100 : 0;
}

function numberFrom(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function TabButton({
  tab,
  active,
  setTab,
  icon: Icon,
  label,
}: {
  tab: Tab;
  active: Tab;
  setTab: (tab: Tab) => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={() => setTab(tab)}
      className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${active === tab ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
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

function BankPicker({
  banks,
  selectedCode,
  onSelect,
}: {
  banks: BankOption[];
  selectedCode: string;
  onSelect: (bank: BankOption) => void;
}) {
  const selectedBank = banks.find((bank) => bank.code === selectedCode);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleBanks = banks
    .filter((bank) =>
      normalizedQuery ? `${bank.name} ${bank.code}`.toLowerCase().includes(normalizedQuery) : true,
    )
    .slice(0, 8);

  return (
    <div className="grid gap-2 text-sm">
      <span className="font-semibold">Bank</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-input bg-background px-3 text-left outline-none transition hover:border-primary focus:border-primary"
          >
            <span className={selectedBank ? "truncate" : "truncate text-muted-foreground"}>
              {selectedBank ? selectedBank.name : "Select bank"}
            </span>
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mb-2 h-10 w-full rounded-xl border border-input bg-background px-3 outline-none focus:border-primary"
            placeholder="Search bank"
          />
          <div className="max-h-64 overflow-y-auto">
            {visibleBanks.length ? (
              visibleBanks.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => {
                    onSelect(bank);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary ${
                    selectedCode === bank.code ? "bg-secondary font-semibold" : ""
                  }`}
                >
                  <span>{bank.name}</span>
                  <span className="text-xs text-muted-foreground">{bank.code}</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-xs text-muted-foreground">No banks found.</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SavedBankCard({ bank }: { bank: SavedBankDetails | null }) {
  if (!hasBankDetails(bank)) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
        No saved payout bank yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Saved payout bank
      </p>
      <p className="mt-2 font-semibold">{bank.bankName ?? "Bank account"}</p>
      {bank.accountName && <p className="text-muted-foreground">{bank.accountName}</p>}
      {bank.accountNumber && (
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {maskAccountNumber(bank.accountNumber)}
        </p>
      )}
    </div>
  );
}

function hasBankDetails(bank: SavedBankDetails | null): bank is SavedBankDetails {
  return Boolean(bank?.accountNumber || bank?.bankName || bank?.accountName);
}

function maskAccountNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return value;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-black">{title}</h2>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function addressLabel(address: Address) {
  return [address.address ?? address.street, address.city, address.state]
    .filter(Boolean)
    .join(", ");
}

function addressToForm(address: Address): typeof emptyAddress {
  return {
    ...emptyAddress,
    type: address.type ?? "SHIPPING",
    address: address.address ?? address.street ?? "",
    city: address.city ?? "",
    state: address.state ?? "Lagos",
    country: address.country ?? "Nigeria",
    contactName: address.contactName ?? "",
    contactPhone: address.contactPhone ?? "",
    latitude: address.latitude == null ? "" : String(address.latitude),
    longitude: address.longitude == null ? "" : String(address.longitude),
    isDefault: Boolean(address.isDefault),
  };
}

function isLikelyLagosCoordinate(latitude: number, longitude: number) {
  return latitude >= 6.35 && latitude <= 6.75 && longitude >= 2.7 && longitude <= 4.4;
}

function clean<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== "" && item !== undefined && item !== null),
  ) as Partial<T>;
}

function prepareAddressPayload(value: typeof emptyAddress) {
  const payload: Record<string, unknown> = clean(value);
  if (payload.latitude) payload.latitude = Number(payload.latitude);
  if (payload.longitude) payload.longitude = Number(payload.longitude);

  if (requiresDeliveryDetails(payload.type)) {
    const state = String(payload.state ?? "")
      .trim()
      .toLowerCase();
    if (!["lagos", "lagos state", "lagos, nigeria"].includes(state))
      throw new Error("Delivery address must be in Lagos.");
    if (!payload.contactPhone) throw new Error("Delivery address needs a contact phone.");
    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      throw new Error("Delivery address needs Lagos latitude and longitude.");
    }
  }
  return payload;
}

function requiresDeliveryDetails(type: unknown) {
  return type === "PICKUP" || type === "SHIPPING" || type === "BILLING";
}
