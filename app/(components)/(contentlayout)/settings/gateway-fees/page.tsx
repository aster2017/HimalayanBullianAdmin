"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAuthHeaders } from "@/shared/services/apiConfig";
import { useProtectedRoute } from "@/shared/hooks/useProtectedRoute";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeeTier {
  upToAmount: number | null;
  feeNpr: number;
}

interface ProviderFeeConfig {
  mode: string | null;
  feeType: string;
  flatFeeNpr: number;
  feePercent: number;
  minFeeNpr: number | null;
  maxFeeNpr: number | null;
  tiers: FeeTier[];
}

interface GatewayFeeConfig {
  defaultMode: string;
  providers: Record<string, ProviderFeeConfig>;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const emptyProvider = (): ProviderFeeConfig => ({
  mode: null,
  feeType: "Flat",
  flatFeeNpr: 0,
  feePercent: 0,
  minFeeNpr: null,
  maxFeeNpr: null,
  tiers: [],
});

const KNOWN_PROVIDERS = ["ConnectIPS", "eSewa", "Khalti", "IMEPay"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function effectiveMode(config: GatewayFeeConfig, provider: string): string {
  return config.providers[provider]?.mode || config.defaultMode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GatewayFeesSettingsPage() {
  useProtectedRoute();

  const [config, setConfig] = useState<GatewayFeeConfig>({
    defaultMode: "AbsorbedByMerchant",
    providers: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    new Set(["ConnectIPS"])
  );

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`${API}/settings/gateway-fees/full`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.config) setConfig(d.config);
      })
      .catch(() => toast.error("Failed to load fee configuration"))
      .finally(() => setLoading(false));
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`${API}/settings/gateway-fees`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Gateway fee settings saved — effective immediately");
      } else {
        toast.error(d.message || "Save failed");
      }
    } catch {
      toast.error("Network error — changes not saved");
    } finally {
      setSaving(false);
    }
  }

  // ── Config mutations ──────────────────────────────────────────────────────

  function setDefaultMode(mode: string) {
    setConfig((c) => ({ ...c, defaultMode: mode }));
  }

  function getProvider(name: string): ProviderFeeConfig {
    return config.providers[name] ?? emptyProvider();
  }

  function setProvider(name: string, patch: Partial<ProviderFeeConfig>) {
    setConfig((c) => ({
      ...c,
      providers: {
        ...c.providers,
        [name]: { ...getProvider(name), ...patch },
      },
    }));
  }

  function setTier(provider: string, index: number, patch: Partial<FeeTier>) {
    const tiers = [...(getProvider(provider).tiers ?? [])];
    tiers[index] = { ...tiers[index], ...patch };
    setProvider(provider, { tiers });
  }

  function addTier(provider: string) {
    const tiers = [...(getProvider(provider).tiers ?? [])];
    tiers.push({ upToAmount: null, feeNpr: 0 });
    setProvider(provider, { tiers });
  }

  function removeTier(provider: string, index: number) {
    const tiers = (getProvider(provider).tiers ?? []).filter(
      (_, i) => i !== index
    );
    setProvider(provider, { tiers });
  }

  function toggleExpanded(name: string) {
    setExpandedProviders((s) => {
      const next = new Set(s);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="ti-spinner" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Page header */}
      <div className="col-span-12">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="font-semibold text-[1rem] mb-1">
              Payment Gateway Fees
            </h5>
            <p className="text-[0.813rem] text-muted">
              Control whether ConnectIPS / payment gateway fees are absorbed by
              HBC or passed to customers. Changes are live immediately — no
              restart required.
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="ti-btn ti-btn-primary-full"
          >
            {saving ? (
              <>
                <span className="ti-spinner me-1" /> Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>

      {/* Default mode card */}
      <div className="col-span-12 xl:col-span-5">
        <div className="box">
          <div className="box-header">
            <h5 className="box-title">Default Fee Mode</h5>
          </div>
          <div className="box-body">
            <p className="text-[0.813rem] text-muted mb-4">
              Applies to any provider that does not have its own Mode override.
            </p>
            <div className="flex flex-col gap-3">
              <ModeRadio
                value="AbsorbedByMerchant"
                current={config.defaultMode}
                onChange={setDefaultMode}
                label="HBC absorbs the fee"
                desc="Customers are charged only the silver amount. HBC covers the gateway cost."
              />
              <ModeRadio
                value="PassedToCustomer"
                current={config.defaultMode}
                onChange={setDefaultMode}
                label="Customer pays the fee"
                desc="The gateway fee is added on top of the payment amount. Shown clearly to the customer before payment."
              />
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className="box mt-6 border border-info/30 bg-info/5">
          <div className="box-body">
            <div className="flex gap-3">
              <i className="bx bx-info-circle text-info text-xl mt-0.5 shrink-0" />
              <div className="text-[0.813rem]">
                <p className="font-semibold text-info mb-1">
                  How NCHL ConnectIPS fees work
                </p>
                <ul className="text-muted space-y-1 list-disc list-inside">
                  <li>≤ NPR 5,000 → NPR 5 flat</li>
                  <li>≤ NPR 25,000 → NPR 10 flat</li>
                  <li>Above NPR 25,000 → NPR 20 flat</li>
                </ul>
                <p className="text-muted mt-2">
                  These tiers are configured below and can be updated if NCHL
                  changes their pricing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Provider cards */}
      <div className="col-span-12 xl:col-span-7 flex flex-col gap-4">
        {KNOWN_PROVIDERS.map((name) => (
          <ProviderCard
            key={name}
            name={name}
            config={config}
            provider={getProvider(name)}
            expanded={expandedProviders.has(name)}
            onToggleExpand={() => toggleExpanded(name)}
            onModeChange={(m) => setProvider(name, { mode: m })}
            onFeeTypeChange={(t) => setProvider(name, { feeType: t })}
            onFlatFeeChange={(v) => setProvider(name, { flatFeeNpr: v })}
            onPercentChange={(v) => setProvider(name, { feePercent: v })}
            onMinChange={(v) => setProvider(name, { minFeeNpr: v })}
            onMaxChange={(v) => setProvider(name, { maxFeeNpr: v })}
            onTierChange={(i, p) => setTier(name, i, p)}
            onAddTier={() => addTier(name)}
            onRemoveTier={(i) => removeTier(name, i)}
          />
        ))}
      </div>

      {/* Bottom save */}
      <div className="col-span-12 flex justify-end pb-4">
        <button
          onClick={save}
          disabled={saving}
          className="ti-btn ti-btn-primary-full"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── ModeRadio ────────────────────────────────────────────────────────────────

function ModeRadio({
  value,
  current,
  onChange,
  label,
  desc,
}: {
  value: string;
  current: string;
  onChange: (v: string) => void;
  label: string;
  desc: string;
}) {
  const active = current === value;
  return (
    <label
      className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        active
          ? "border-primary bg-primary/5"
          : "border-defaultborder hover:bg-light"
      }`}
    >
      <input
        type="radio"
        className="mt-0.5 shrink-0"
        checked={active}
        onChange={() => onChange(value)}
      />
      <div>
        <p className={`text-[0.875rem] font-semibold ${active ? "text-primary" : ""}`}>
          {label}
        </p>
        <p className="text-[0.75rem] text-muted mt-0.5">{desc}</p>
      </div>
    </label>
  );
}

// ─── ProviderCard ─────────────────────────────────────────────────────────────

interface ProviderCardProps {
  name: string;
  config: GatewayFeeConfig;
  provider: ProviderFeeConfig;
  expanded: boolean;
  onToggleExpand: () => void;
  onModeChange: (m: string | null) => void;
  onFeeTypeChange: (t: string) => void;
  onFlatFeeChange: (v: number) => void;
  onPercentChange: (v: number) => void;
  onMinChange: (v: number | null) => void;
  onMaxChange: (v: number | null) => void;
  onTierChange: (i: number, p: Partial<FeeTier>) => void;
  onAddTier: () => void;
  onRemoveTier: (i: number) => void;
}

function ProviderCard({
  name,
  config,
  provider,
  expanded,
  onToggleExpand,
  onModeChange,
  onFeeTypeChange,
  onFlatFeeChange,
  onPercentChange,
  onMinChange,
  onMaxChange,
  onTierChange,
  onAddTier,
  onRemoveTier,
}: ProviderCardProps) {
  const effective = effectiveMode(config, name);
  const isPassedToCustomer = effective === "PassedToCustomer";
  const configured = !!config.providers[name];

  return (
    <div className="box">
      {/* Header row */}
      <div className="box-header">
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h5 className="box-title mb-0">{name}</h5>
              {!configured && (
                <span className="badge bg-light text-muted text-[0.7rem]">
                  using default
                </span>
              )}
              <span
                className={`badge text-[0.7rem] ${
                  isPassedToCustomer
                    ? "bg-warning/15 text-warning"
                    : "bg-success/15 text-success"
                }`}
              >
                {isPassedToCustomer ? "Customer pays fee" : "HBC absorbs fee"}
              </span>
            </div>
          </div>
          <button
            onClick={onToggleExpand}
            className="ti-btn ti-btn-sm ti-btn-light py-1 px-3"
          >
            {expanded ? "Collapse" : "Configure"}
            <i
              className={`bx bx-chevron-${expanded ? "up" : "down"} ms-1`}
            />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="box-body border-t border-defaultborder">
          {/* Mode override */}
          <div className="mb-5">
            <label className="form-label font-semibold text-[0.813rem] mb-2">
              Fee Mode
            </label>
            <div className="flex flex-col gap-2">
              <ModeRadio
                value=""
                current={provider.mode ?? ""}
                onChange={() => onModeChange(null)}
                label={`Use default (${config.defaultMode === "PassedToCustomer" ? "Customer pays" : "HBC absorbs"})`}
                desc="Inherits from the Default Fee Mode setting above."
              />
              <ModeRadio
                value="AbsorbedByMerchant"
                current={provider.mode ?? ""}
                onChange={() => onModeChange("AbsorbedByMerchant")}
                label="HBC absorbs — override for this provider"
                desc="Even if the default is PassedToCustomer, this provider's fee is always absorbed by HBC."
              />
              <ModeRadio
                value="PassedToCustomer"
                current={provider.mode ?? ""}
                onChange={() => onModeChange("PassedToCustomer")}
                label="Customer pays — override for this provider"
                desc="Even if the default is AbsorbedByMerchant, this provider's fee is always added to the customer's charge."
              />
            </div>
          </div>

          {/* Fee type */}
          <div className="mb-5">
            <label className="form-label font-semibold text-[0.813rem]">
              Fee Structure
            </label>
            <div className="flex gap-2 mt-2">
              {["Flat", "Percentage", "Tiered"].map((t) => (
                <button
                  key={t}
                  onClick={() => onFeeTypeChange(t)}
                  className={`ti-btn ti-btn-sm ${
                    provider.feeType === t
                      ? "ti-btn-primary"
                      : "ti-btn-light"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Fee fields */}
          {provider.feeType === "Flat" && (
            <FlatFeeFields
              flatFee={provider.flatFeeNpr}
              onChange={onFlatFeeChange}
            />
          )}
          {provider.feeType === "Percentage" && (
            <PercentageFeeFields
              percent={provider.feePercent}
              min={provider.minFeeNpr}
              max={provider.maxFeeNpr}
              onPercent={onPercentChange}
              onMin={onMinChange}
              onMax={onMaxChange}
            />
          )}
          {provider.feeType === "Tiered" && (
            <TieredFeeFields
              tiers={provider.tiers}
              onChange={onTierChange}
              onAdd={onAddTier}
              onRemove={onRemoveTier}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Fee field sub-components ─────────────────────────────────────────────────

function FlatFeeFields({
  flatFee,
  onChange,
}: {
  flatFee: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="max-w-xs">
      <label className="form-label text-[0.813rem]">Fixed Fee (NPR)</label>
      <div className="input-group">
        <span className="input-group-text">NPR</span>
        <input
          type="number"
          min={0}
          step={0.01}
          className="form-control"
          value={flatFee}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

function PercentageFeeFields({
  percent,
  min,
  max,
  onPercent,
  onMin,
  onMax,
}: {
  percent: number;
  min: number | null;
  max: number | null;
  onPercent: (v: number) => void;
  onMin: (v: number | null) => void;
  onMax: (v: number | null) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="form-label text-[0.813rem]">Percentage (%)</label>
        <div className="input-group">
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            className="form-control"
            value={percent}
            onChange={(e) => onPercent(Number(e.target.value))}
          />
          <span className="input-group-text">%</span>
        </div>
      </div>
      <div>
        <label className="form-label text-[0.813rem]">
          Min Fee (NPR)
          <span className="text-muted ms-1 text-[0.7rem]">optional</span>
        </label>
        <div className="input-group">
          <span className="input-group-text">NPR</span>
          <input
            type="number"
            min={0}
            step={0.01}
            className="form-control"
            value={min ?? ""}
            placeholder="None"
            onChange={(e) =>
              onMin(e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </div>
      </div>
      <div>
        <label className="form-label text-[0.813rem]">
          Max Fee (NPR)
          <span className="text-muted ms-1 text-[0.7rem]">optional</span>
        </label>
        <div className="input-group">
          <span className="input-group-text">NPR</span>
          <input
            type="number"
            min={0}
            step={0.01}
            className="form-control"
            value={max ?? ""}
            placeholder="None"
            onChange={(e) =>
              onMax(e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </div>
      </div>
    </div>
  );
}

function TieredFeeFields({
  tiers,
  onChange,
  onAdd,
  onRemove,
}: {
  tiers: FeeTier[];
  onChange: (i: number, p: Partial<FeeTier>) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="form-label text-[0.813rem] font-semibold mb-0">
            Fee Tiers
          </p>
          <p className="text-[0.75rem] text-muted">
            Evaluated top-to-bottom. First matching tier wins. Leave "Up To"
            blank for the catch-all row.
          </p>
        </div>
        <button
          onClick={onAdd}
          className="ti-btn ti-btn-sm ti-btn-success-full"
        >
          <i className="bx bx-plus me-1" /> Add Tier
        </button>
      </div>

      {tiers.length === 0 && (
        <p className="text-muted text-[0.813rem] italic py-3 text-center">
          No tiers defined. Add at least one tier.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {tiers.map((tier, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg bg-light border border-defaultborder"
          >
            <span className="text-muted text-[0.75rem] font-mono w-5 shrink-0">
              {i + 1}.
            </span>

            <div className="flex-1">
              <label className="text-[0.7rem] text-muted mb-1 block">
                Up To (NPR)
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text">NPR</span>
                <input
                  type="number"
                  min={0}
                  className="form-control form-control-sm"
                  value={tier.upToAmount ?? ""}
                  placeholder="∞ (catch-all)"
                  onChange={(e) =>
                    onChange(i, {
                      upToAmount:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <i className="bx bx-arrow-from-left text-muted text-sm" />

            <div className="flex-1">
              <label className="text-[0.7rem] text-muted mb-1 block">
                Fee (NPR)
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text">NPR</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className="form-control form-control-sm"
                  value={tier.feeNpr}
                  onChange={(e) =>
                    onChange(i, { feeNpr: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <button
              onClick={() => onRemove(i)}
              className="ti-btn ti-btn-sm ti-btn-danger-full p-1.5"
              title="Remove tier"
            >
              <i className="bx bx-trash" />
            </button>
          </div>
        ))}
      </div>

      {tiers.length > 0 && (
        <p className="text-[0.75rem] text-muted mt-2">
          <i className="bx bx-info-circle me-1" />
          The last tier should have "Up To" blank to catch any amount above the
          previous tier.
        </p>
      )}
    </div>
  );
}
