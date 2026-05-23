"use client";

import { useState, useEffect } from "react";
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc, Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import type {
  ZzcProduct, ProductType, Platform, DeploymentStatus, MonetizationType,
} from "../../../lib/types/zzc-product";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_TYPES: { value: ProductType; label: string; emoji: string }[] = [
  { value: "constitution-tree", label: "Constitution Tree", emoji: "🌳" },
  { value: "finance-tree",      label: "Finance Tree",      emoji: "💰" },
  { value: "development-tree",  label: "Development Tree",  emoji: "🌱" },
  { value: "law-tree",          label: "Law Tree",          emoji: "⚖️" },
  { value: "banking-tree",      label: "Banking Tree",      emoji: "🏦" },
  { value: "custom",            label: "Custom",            emoji: "✨" },
];

const STATUS_META: Record<DeploymentStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",     color: "text-zinc-400",   bg: "bg-zinc-800/60"  },
  testing:   { label: "Testing",   color: "text-amber-400",  bg: "bg-amber-900/30" },
  ready:     { label: "Ready",     color: "text-blue-400",   bg: "bg-blue-900/30"  },
  published: { label: "Published", color: "text-green-400",  bg: "bg-green-900/30" },
  archived:  { label: "Archived",  color: "text-zinc-600",   bg: "bg-zinc-900/60"  },
};

const ALL_PLATFORMS: Platform[] = ["web", "android", "ios", "windows", "macos"];

const PLATFORM_ICONS: Record<Platform, string> = {
  web:     "🌐",
  android: "🤖",
  ios:     "🍎",
  windows: "🪟",
  macos:   "💻",
};

const MONETIZATION_LABELS: Record<MonetizationType, string> = {
  free:          "Free",
  premium:       "Premium",
  donation:      "Donation",
  subscription:  "Subscription",
  institutional: "Institutional",
};

// ─── Empty product template ────────────────────────────────────────────────────

function emptyProduct(ownerId: string): Omit<ZzcProduct, "productId"> {
  const now = new Date().toISOString();
  return {
    ownerId,
    name: "",
    slug: "",
    tagline: "",
    description: "",
    icon: "🌳",
    heroImage: "",
    theme: "forest",
    productType: "constitution-tree",
    platforms: ["web"],
    deploymentStatus: "draft",
    version: "0.1.0",
    buildNumber: 1,
    routes: { webUrl: "", appRoute: "", storeUrls: {} },
    monetization: { type: "free", revenueEnabled: false },
    branding: { accentColor: "#22c55e", ambientTheme: "sacred-forest" },
    analytics: { installs: 0, activeUsers: 0, retention: 0, sessionTime: 0 },
    createdAt: now,
    updatedAt: now,
  };
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onStatusChange,
}: {
  product:        ZzcProduct;
  onEdit:         (p: ZzcProduct) => void;
  onStatusChange: (p: ZzcProduct, s: DeploymentStatus) => void;
}) {
  const st  = STATUS_META[product.deploymentStatus];
  const pt  = PRODUCT_TYPES.find(t => t.value === product.productType);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{product.icon}</span>
            <div>
              <h3 className="font-bold text-white text-lg leading-tight">{product.name}</h3>
              <p className="text-zinc-500 text-xs font-mono">/{product.slug}</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${st.color} ${st.bg} shrink-0`}>
            {st.label}
          </span>
        </div>

        <p className="text-zinc-400 text-sm mb-3">{product.tagline}</p>

        {/* Type badge */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-sm">{pt?.emoji}</span>
          <span className="text-xs text-zinc-500">{pt?.label}</span>
          <span className="text-zinc-700 mx-1">·</span>
          <span className="text-xs text-zinc-500">v{product.version}</span>
          <span className="text-zinc-700 mx-1">·</span>
          <span className="text-xs text-zinc-500">build #{product.buildNumber}</span>
        </div>

        {/* Platforms */}
        <div className="flex gap-1.5 mb-3">
          {ALL_PLATFORMS.map(p => (
            <span
              key={p}
              title={p}
              className={`text-base px-1 rounded ${
                product.platforms.includes(p)
                  ? "opacity-100"
                  : "opacity-20 grayscale"
              }`}
            >
              {PLATFORM_ICONS[p]}
            </span>
          ))}
        </div>
      </div>

      {/* Analytics strip */}
      <div className="grid grid-cols-4 border-t border-zinc-800/60">
        {[
          { label: "Installs",  value: product.analytics.installs  ?? 0 },
          { label: "Users",     value: product.analytics.activeUsers ?? 0 },
          { label: "Retention", value: `${product.analytics.retention ?? 0}%` },
          { label: "Session",   value: `${product.analytics.sessionTime ?? 0}s` },
        ].map(s => (
          <div key={s.label} className="p-2.5 text-center border-r border-zinc-800/60 last:border-0">
            <p className="text-sm font-bold text-white">{s.value}</p>
            <p className="text-zinc-600 text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Monetization */}
      <div className="px-4 py-2.5 border-t border-zinc-800/60 flex items-center justify-between">
        <span className={`text-xs font-semibold ${
          product.monetization.revenueEnabled ? "text-green-400" : "text-zinc-500"
        }`}>
          {product.monetization.revenueEnabled ? "💳 Revenue On" : "🆓 Free"}&nbsp;·&nbsp;
          {MONETIZATION_LABELS[product.monetization.type]}
        </span>
        {product.routes.webUrl && (
          <a
            href={product.routes.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Open ↗
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 pt-2 flex items-center gap-2">
        <button
          onClick={() => onEdit(product)}
          className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
        >
          Edit
        </button>
        <select
          value={product.deploymentStatus}
          onChange={e => onStatusChange(product, e.target.value as DeploymentStatus)}
          className="py-2 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border-0 outline-none cursor-pointer"
        >
          {(Object.keys(STATUS_META) as DeploymentStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── ProductForm ──────────────────────────────────────────────────────────────

function ProductForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Partial<ZzcProduct> & { ownerId: string };
  onSave:  (data: Omit<ZzcProduct, "productId">) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<ZzcProduct, "productId">>(
    emptyProduct(initial.ownerId)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial.productId) {
      const { productId: _id, ...rest } = initial as ZzcProduct;
      setForm(rest as Omit<ZzcProduct, "productId">);
    }
  }, [initial]);

  const field = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, updatedAt: new Date().toISOString() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="font-bold text-white text-lg">
            {initial.productId ? "Edit Product" : "New Product"}
          </h2>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Basic */}
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-1">
              <label className="text-xs text-zinc-500 block mb-1">Icon</label>
              <input
                value={form.icon}
                onChange={e => field("icon", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-center text-2xl text-white outline-none focus:border-zinc-600"
                maxLength={4}
              />
            </div>
            <div className="col-span-3">
              <label className="text-xs text-zinc-500 block mb-1">Name *</label>
              <input
                required
                value={form.name}
                onChange={e => field("name", e.target.value)}
                placeholder="Constitution Tree"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-zinc-600"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-zinc-500 block mb-1">Slug *</label>
              <input
                required
                value={form.slug}
                onChange={e => field("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="constitution-tree"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1">Tagline</label>
            <input
              value={form.tagline}
              onChange={e => field("tagline", e.target.value)}
              placeholder="Explore Nepal's Constitution as a living forest"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => field("description", e.target.value)}
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Product Type</label>
              <select
                value={form.productType}
                onChange={e => field("productType", e.target.value as ProductType)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-zinc-600"
              >
                {PRODUCT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Status</label>
              <select
                value={form.deploymentStatus}
                onChange={e => field("deploymentStatus", e.target.value as DeploymentStatus)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-zinc-600"
              >
                {(Object.keys(STATUS_META) as DeploymentStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Version */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Version</label>
              <input
                value={form.version}
                onChange={e => field("version", e.target.value)}
                placeholder="0.1.0"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none focus:border-zinc-600"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Build #</label>
              <input
                type="number"
                min={1}
                value={form.buildNumber}
                onChange={e => field("buildNumber", parseInt(e.target.value) || 1)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Target Platforms</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map(p => {
                const active = form.platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => field(
                      "platforms",
                      active
                        ? form.platforms.filter(x => x !== p)
                        : [...form.platforms, p]
                    )}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      active
                        ? "bg-green-900/40 border-green-700 text-green-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    }`}
                  >
                    <span>{PLATFORM_ICONS[p]}</span>
                    <span className="capitalize">{p}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Routes */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 block">Web URL</label>
            <input
              value={form.routes.webUrl ?? ""}
              onChange={e => field("routes", { ...form.routes, webUrl: e.target.value })}
              placeholder="https://zzc.app/constitution"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none focus:border-zinc-600"
            />
          </div>

          {/* Monetization */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Monetization</label>
              <select
                value={form.monetization.type}
                onChange={e => field("monetization", { ...form.monetization, type: e.target.value as MonetizationType })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-zinc-600"
              >
                {(Object.keys(MONETIZATION_LABELS) as MonetizationType[]).map(m => (
                  <option key={m} value={m}>{MONETIZATION_LABELS[m]}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.monetization.revenueEnabled}
                  onChange={e => field("monetization", { ...form.monetization, revenueEnabled: e.target.checked })}
                  className="w-4 h-4 accent-green-500"
                />
                <span className="text-sm text-zinc-300">Revenue Enabled</span>
              </label>
            </div>
          </div>

          {/* Branding */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.branding.accentColor ?? "#22c55e"}
                  onChange={e => field("branding", { ...form.branding, accentColor: e.target.value })}
                  className="w-10 h-9 rounded-lg border border-zinc-800 bg-zinc-900 cursor-pointer"
                />
                <input
                  value={form.branding.accentColor ?? ""}
                  onChange={e => field("branding", { ...form.branding, accentColor: e.target.value })}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none focus:border-zinc-600"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Ambient Theme</label>
              <input
                value={form.branding.ambientTheme ?? ""}
                onChange={e => field("branding", { ...form.branding, ambientTheme: e.target.value })}
                placeholder="sacred-forest"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-zinc-600"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {saving ? "Saving…" : initial.productId ? "Update Product" : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export default function ProductsClient() {
  const { uid, loading: authLoading } = useVaultAuth();
  const [products, setProducts]       = useState<ZzcProduct[]>([]);
  const [loading, setLoading]         = useState(true);
  const [editTarget, setEditTarget]   = useState<ZzcProduct | null>(null);
  const [creating, setCreating]       = useState(false);
  const [filterStatus, setFilterStatus] = useState<DeploymentStatus | "all">("all");

  const loadProducts = async (userId: string) => {
    setLoading(true);
    try {
      const q    = query(collection(db, "zzc_products"), where("ownerId", "==", userId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ productId: d.id, ...d.data() } as ZzcProduct));
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setProducts(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid) loadProducts(uid);
  }, [uid]);

  const handleSave = async (data: Omit<ZzcProduct, "productId">) => {
    if (!uid) return;
    if (editTarget) {
      await updateDoc(doc(db, "zzc_products", editTarget.productId), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await addDoc(collection(db, "zzc_products"), {
        ...data,
        ownerId:   uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setEditTarget(null);
    setCreating(false);
    await loadProducts(uid);
  };

  const handleStatusChange = async (product: ZzcProduct, status: DeploymentStatus) => {
    await updateDoc(doc(db, "zzc_products", product.productId), {
      deploymentStatus: status,
      updatedAt: new Date().toISOString(),
    });
    await loadProducts(uid!);
  };

  const visible = filterStatus === "all"
    ? products
    : products.filter(p => p.deploymentStatus === filterStatus);

  const statusCounts = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.deploymentStatus] = (acc[p.deploymentStatus] ?? 0) + 1;
    return acc;
  }, {});

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-900 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/vault" className="text-zinc-500 hover:text-white text-sm transition-colors">
              ← Vault
            </Link>
            <span className="text-zinc-700">/</span>
            <div>
              <h1 className="font-black text-xl">Products</h1>
              <p className="text-zinc-500 text-xs">ZZC intelligence product ecosystem</p>
            </div>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-800 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            + New Product
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "All",       count: products.length,            status: "all"       as const },
            { label: "Draft",     count: statusCounts.draft     ?? 0, status: "draft"     as const },
            { label: "Testing",   count: statusCounts.testing   ?? 0, status: "testing"   as const },
            { label: "Ready",     count: statusCounts.ready     ?? 0, status: "ready"     as const },
            { label: "Published", count: statusCounts.published ?? 0, status: "published" as const },
          ].map(s => {
            const active = filterStatus === s.status;
            const meta   = s.status === "all" ? null : STATUS_META[s.status];
            return (
              <button
                key={s.status}
                onClick={() => setFilterStatus(s.status)}
                className={`p-3 rounded-2xl border text-center transition-colors ${
                  active
                    ? "border-zinc-600 bg-zinc-800"
                    : "border-zinc-800/60 bg-zinc-950 hover:border-zinc-700"
                }`}
              >
                <p className={`text-2xl font-black ${meta?.color ?? "text-white"}`}>{s.count}</p>
                <p className="text-zinc-500 text-xs">{s.label}</p>
              </button>
            );
          })}
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-zinc-500">Loading products…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span className="text-5xl">🌳</span>
            <div className="text-center">
              <p className="text-zinc-300 font-semibold">No products yet</p>
              <p className="text-zinc-600 text-sm mt-1">
                Build your first intelligence product
              </p>
            </div>
            <button
              onClick={() => setCreating(true)}
              className="px-5 py-2.5 bg-green-800 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Create Constitution Tree App
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map(p => (
              <ProductCard
                key={p.productId}
                product={p}
                onEdit={setEditTarget}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}

        {/* Roadmap section */}
        <div className="border border-zinc-800/60 rounded-2xl p-6">
          <h2 className="font-bold text-zinc-300 text-sm mb-4 uppercase tracking-wider">
            Future Tree Ecosystem
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { emoji: "🌳", label: "Constitution Tree", status: "MVP",    color: "border-green-800/60 bg-green-950/30" },
              { emoji: "🌱", label: "Development Tree",  status: "Future", color: "border-zinc-800/40 bg-zinc-950/60"   },
              { emoji: "💰", label: "Finance Tree",      status: "Future", color: "border-zinc-800/40 bg-zinc-950/60"   },
              { emoji: "🏦", label: "Banking Tree",      status: "Future", color: "border-zinc-800/40 bg-zinc-950/60"   },
              { emoji: "⚖️", label: "Law Tree",          status: "Future", color: "border-zinc-800/40 bg-zinc-950/60"   },
            ].map(t => (
              <div
                key={t.label}
                className={`border rounded-xl p-3 text-center ${t.color}`}
              >
                <span className="text-2xl block mb-1">{t.emoji}</span>
                <p className="text-xs text-zinc-300 font-medium leading-tight">{t.label}</p>
                <p className={`text-[10px] mt-1 font-semibold ${
                  t.status === "MVP" ? "text-green-400" : "text-zinc-600"
                }`}>{t.status}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Publishing pipeline note */}
        <div className="bg-zinc-950 border border-zinc-800/40 rounded-xl p-4 flex items-start gap-3">
          <span className="text-lg mt-0.5">🚀</span>
          <div>
            <p className="text-zinc-300 text-sm font-semibold">Publishing Pipeline — Coming Soon</p>
            <p className="text-zinc-600 text-xs mt-0.5">
              One-click deploy to Play Store · App Store Connect · Microsoft Store · Stripe Revenue.
              Integration via Expo/EAS, Capacitor, or Tauri — not yet active.
            </p>
          </div>
        </div>
      </div>

      {/* Form modal */}
      {(creating || editTarget) && (
        <ProductForm
          initial={editTarget ?? { ownerId: uid ?? "" }}
          onSave={handleSave}
          onClose={() => { setCreating(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
