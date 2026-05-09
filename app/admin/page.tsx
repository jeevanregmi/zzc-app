"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";

import epfData from "../scripts/epfDatabase.json";
import citData from "../scripts/citDatabase.json";
import ssfData from "../scripts/ssfDatabase.json";

// ─── Types ──────────────────────────────────────────────────────────────────

type UploadStatus = { type: "success" | "error" | "warning"; message: string } | null;

// ─── Login Gate ──────────────────────────────────────────────────────────────

function LoginForm({ onLogin }: { onLogin: (email: string, pass: string) => Promise<string | null> }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const err = await onLogin(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">

        <h1 className="text-4xl font-black text-green-400 mb-2">ZZC Admin</h1>
        <p className="text-zinc-500 mb-8">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="
              w-full bg-zinc-900 border border-zinc-700 rounded-2xl
              px-5 py-3 text-white placeholder-zinc-600
              focus:outline-none focus:border-green-500
            "
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="
              w-full bg-zinc-900 border border-zinc-700 rounded-2xl
              px-5 py-3 text-white placeholder-zinc-600
              focus:outline-none focus:border-green-500
            "
          />

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="
              w-full bg-green-500 hover:bg-green-400
              disabled:bg-zinc-700 disabled:text-zinc-500
              text-black font-black py-3 rounded-2xl transition
            "
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

        </form>

      </div>
    </main>
  );

}

// ─── Main Admin Panel ────────────────────────────────────────────────────────

const DATABASES = [
  { key: "epf", label: "EPF", color: "bg-blue-600", data: epfData as any[] },
  { key: "cit", label: "CIT", color: "bg-purple-600", data: citData as any[] },
  { key: "ssf", label: "SSF", color: "bg-orange-600", data: ssfData as any[] },
];

const orgColor: Record<string, string> = {
  EPF: "bg-blue-600",
  CIT: "bg-purple-600",
  SSF: "bg-orange-600",
};

export default function AdminPage() {

  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Schemes list
  const [schemes, setSchemes] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Upload panel
  const [jsonInput, setJsonInput] = useState("");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(null);
  const [uploading, setUploading] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Auth listener ──────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user) fetchSchemes();
  }, [user]);

  // ── Firestore helpers ──────────────────────────────────────────────────────

  const fetchSchemes = async () => {
    try {
      const qs = await getDocs(collection(db, "structuredSchemes"));
      const data: any[] = [];
      qs.forEach((d) => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.organization ?? "").localeCompare(b.organization ?? ""));
      setSchemes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const updateScheme = async (id: string, field: string, value: any) => {
    try {
      setSaving(true);
      await updateDoc(doc(db, "structuredSchemes", id), { [field]: value });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteScheme = async (id: string) => {
    try {
      await deleteDoc(doc(db, "structuredSchemes", id));
      setSchemes((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Upload logic ───────────────────────────────────────────────────────────

  const parseInput = (): any[] | null => {
    if (!jsonInput.trim()) return null;
    try {
      const parsed = JSON.parse(jsonInput);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return null;
    }
  };

  const getDuplicates = (items: any[]): string[] => {
    const existingTitles = new Set(schemes.map((s) => s.title?.toLowerCase()));
    return items
      .filter((item) => existingTitles.has(item.title?.toLowerCase()))
      .map((item) => item.title);
  };

  const uploadJson = async () => {
    setUploadStatus(null);

    const items = parseInput();
    if (!items) {
      setUploadStatus({ type: "error", message: "Invalid JSON — check your format." });
      return;
    }
    if (items.length === 0) {
      setUploadStatus({ type: "error", message: "JSON array is empty." });
      return;
    }

    const duplicates = getDuplicates(items);
    const toUpload = skipDuplicates
      ? items.filter((item) => !duplicates.includes(item.title))
      : items;

    if (toUpload.length === 0) {
      setUploadStatus({
        type: "warning",
        message: `All ${items.length} schemes already exist in Firebase. Uncheck "Skip duplicates" to overwrite.`,
      });
      return;
    }

    setUploading(true);
    try {
      for (const item of toUpload) {
        await addDoc(collection(db, "structuredSchemes"), {
          ...item,
          createdAt: new Date(),
        });
      }
      const skippedMsg = duplicates.length > 0 && skipDuplicates
        ? ` (${duplicates.length} duplicate${duplicates.length > 1 ? "s" : ""} skipped)`
        : "";
      setUploadStatus({
        type: "success",
        message: `${toUpload.length} scheme${toUpload.length > 1 ? "s" : ""} uploaded successfully!${skippedMsg}`,
      });
      setJsonInput("");
      await fetchSchemes();
    } catch (err) {
      console.error(err);
      setUploadStatus({ type: "error", message: "Upload failed — check console for details." });
    } finally {
      setUploading(false);
    }
  };

  // ── Auth actions ───────────────────────────────────────────────────────────

  const handleLogin = async (email: string, password: string): Promise<string | null> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch (err: any) {
      const code: string = err?.code ?? "";
      console.error("Firebase Auth error:", code, err?.message);
      switch (code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          return "Wrong email or password.";
        case "auth/operation-not-allowed":
          return "Email/Password sign-in is not enabled — go to Firebase Console → Authentication → Sign-in method and enable it.";
        case "auth/too-many-requests":
          return "Too many failed attempts. Wait a few minutes or reset your password in Firebase Console.";
        case "auth/network-request-failed":
          return "Network error — check your internet connection.";
        case "auth/user-disabled":
          return "This account has been disabled in Firebase Console.";
        case "auth/invalid-email":
          return "Invalid email address format.";
        default:
          return `Sign-in failed (${code || "unknown error"}) — check browser console for details.`;
      }
    }
  };

  const handleLogout = () => signOut(auth);

  // ── Preview helpers ────────────────────────────────────────────────────────

  const previewItems = parseInput();
  const previewDuplicates = previewItems ? getDuplicates(previewItems) : [];

  // ── Render ─────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-600">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (

    <main className="min-h-screen bg-black text-white px-6 py-12">

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-12 flex-wrap gap-4">

          <div>
            <h1 className="text-5xl font-black text-green-400 mb-2">Admin Panel</h1>
            <p className="text-zinc-500">{user.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-xl text-sm transition"
          >
            Sign out
          </button>

        </div>

        {/* Saving indicator */}
        {saving && (
          <div className="fixed bottom-6 right-6 bg-green-500 text-black font-black px-5 py-3 rounded-2xl shadow-xl z-50 text-sm">
            Saving...
          </div>
        )}

        {/* ── Quick Load ──────────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-8">

          <h2 className="text-2xl font-black mb-2">Quick Load Databases</h2>

          <p className="text-zinc-500 text-sm mb-6">
            Load a pre-built database into the upload area. Review, then upload to Firebase.
          </p>

          <div className="flex gap-3 flex-wrap">
            {DATABASES.map((db) => {
              const dupeCount = getDuplicates(db.data).length;
              const newCount = db.data.length - dupeCount;
              return (
                <button
                  key={db.key}
                  onClick={() => {
                    setJsonInput(JSON.stringify(db.data, null, 2));
                    setUploadStatus(null);
                  }}
                  className="
                    flex items-center gap-3
                    bg-black border border-zinc-700 hover:border-zinc-500
                    px-5 py-3 rounded-2xl transition
                  "
                >
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white font-black ${db.color}`}>
                    {db.label}
                  </span>
                  <span className="text-white font-bold">{db.data.length} schemes</span>
                  {dupeCount > 0 && (
                    <span className="text-xs text-yellow-500">{dupeCount} already in Firebase</span>
                  )}
                  {dupeCount === 0 && schemes.length > 0 && (
                    <span className="text-xs text-green-500">{newCount} new</span>
                  )}
                </button>
              );
            })}
          </div>

        </div>

        {/* ── Upload Panel ────────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-12">

          <h2 className="text-2xl font-black mb-2">Upload to Firebase</h2>

          <p className="text-zinc-500 text-sm mb-6">
            Paste JSON or use Quick Load above. Single object or array both work.
          </p>

          <textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              setUploadStatus(null);
            }}
            placeholder={'Paste JSON here, or click a Quick Load button above...'}
            rows={14}
            className="
              w-full bg-black border border-zinc-700 rounded-2xl
              p-4 text-sm font-mono text-green-300 placeholder-zinc-700
              focus:outline-none focus:border-green-500 resize-y
            "
          />

          {/* Preview bar */}
          {previewItems && (
            <div className="mt-3 flex items-center gap-4 flex-wrap text-sm">
              <span className="text-zinc-400">
                <span className="text-white font-bold">{previewItems.length}</span> schemes in JSON
              </span>
              {previewDuplicates.length > 0 && (
                <span className="text-yellow-500">
                  {previewDuplicates.length} already in Firebase
                  {skipDuplicates ? " (will skip)" : " (will overwrite)"}
                </span>
              )}
              {previewDuplicates.length === 0 && previewItems.length > 0 && (
                <span className="text-green-500">All new — ready to upload</span>
              )}
            </div>
          )}

          {jsonInput && !previewItems && (
            <p className="text-red-400 text-sm mt-3">Invalid JSON format</p>
          )}

          {/* Options + Actions */}
          <div className="flex items-center justify-between mt-5 flex-wrap gap-4">

            <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="w-4 h-4 accent-green-500"
              />
              Skip schemes already in Firebase
            </label>

            <div className="flex items-center gap-3">
              {jsonInput && (
                <button
                  onClick={() => { setJsonInput(""); setUploadStatus(null); }}
                  className="text-zinc-600 hover:text-white text-sm transition"
                >
                  Clear
                </button>
              )}
              <button
                onClick={uploadJson}
                disabled={uploading || !jsonInput.trim()}
                className="
                  bg-green-500 hover:bg-green-400
                  disabled:bg-zinc-800 disabled:text-zinc-600
                  text-black font-black px-8 py-3 rounded-2xl text-base transition
                "
              >
                {uploading ? "Uploading..." : "Upload to Firebase"}
              </button>
            </div>

          </div>

          {/* Status */}
          {uploadStatus && (
            <div
              className={`
                mt-4 px-5 py-4 rounded-2xl font-bold text-sm
                ${uploadStatus.type === "success" ? "bg-green-500 text-black" : ""}
                ${uploadStatus.type === "error" ? "bg-red-600 text-white" : ""}
                ${uploadStatus.type === "warning" ? "bg-yellow-500 text-black" : ""}
              `}
            >
              {uploadStatus.message}
            </div>
          )}

        </div>

        {/* ── Scheme Editor ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-2xl font-black text-green-400">
            All Schemes ({schemes.length})
          </h2>
          <div className="flex gap-2 text-xs text-zinc-600">
            {["EPF", "CIT", "SSF"].map((org) => {
              const count = schemes.filter((s) => s.organization === org).length;
              return (
                <span key={org} className={`px-3 py-1 rounded-full font-bold ${orgColor[org] ?? "bg-zinc-700"} text-white`}>
                  {org} {count}
                </span>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">

          {schemes.map((scheme, index) => (

            <div
              key={scheme.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
            >

              {/* Card header */}
              <div className="flex items-start justify-between gap-4 mb-6">

                <div>
                  <h3 className="text-2xl font-black text-white">{scheme.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white font-bold mt-1 inline-block ${orgColor[scheme.organization] ?? "bg-zinc-700"}`}>
                    {scheme.organization}
                  </span>
                </div>

                {/* Delete */}
                {confirmDeleteId === scheme.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-red-400 text-sm font-bold">Delete?</span>
                    <button
                      onClick={() => deleteScheme(scheme.id)}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition"
                    >
                      Yes, delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-zinc-500 hover:text-white text-xs px-3 py-1.5 border border-zinc-700 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(scheme.id)}
                    className="text-zinc-700 hover:text-red-400 text-xs border border-zinc-800 hover:border-red-500/50 px-3 py-1.5 rounded-xl transition shrink-0"
                  >
                    Delete
                  </button>
                )}

              </div>

              {/* Editable fields */}
              <div className="grid md:grid-cols-2 gap-5">

                <div>
                  <label className="block text-zinc-500 text-xs font-bold mb-1.5 uppercase tracking-wide">Organization</label>
                  <input
                    type="text"
                    value={scheme.organization || ""}
                    onChange={(e) => {
                      const updated = [...schemes];
                      updated[index] = { ...updated[index], organization: e.target.value };
                      setSchemes(updated);
                    }}
                    onBlur={() => updateScheme(scheme.id, "organization", scheme.organization)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-zinc-500 text-xs font-bold mb-1.5 uppercase tracking-wide">Category</label>
                  <input
                    type="text"
                    value={scheme.category || ""}
                    onChange={(e) => {
                      const updated = [...schemes];
                      updated[index] = { ...updated[index], category: e.target.value };
                      setSchemes(updated);
                    }}
                    onBlur={() => updateScheme(scheme.id, "category", scheme.category)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-zinc-500 text-xs font-bold mb-1.5 uppercase tracking-wide">Interest Rate %</label>
                  <input
                    type="number"
                    value={scheme.interestRate ?? ""}
                    onChange={(e) => {
                      const updated = [...schemes];
                      updated[index] = { ...updated[index], interestRate: e.target.value === "" ? null : Number(e.target.value) };
                      setSchemes(updated);
                    }}
                    onBlur={() => updateScheme(scheme.id, "interestRate", scheme.interestRate)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm"
                    placeholder="null"
                  />
                </div>

                <div>
                  <label className="block text-zinc-500 text-xs font-bold mb-1.5 uppercase tracking-wide">Liquidity</label>
                  <input
                    type="text"
                    value={scheme.liquidity || ""}
                    onChange={(e) => {
                      const updated = [...schemes];
                      updated[index] = { ...updated[index], liquidity: e.target.value };
                      setSchemes(updated);
                    }}
                    onBlur={() => updateScheme(scheme.id, "liquidity", scheme.liquidity)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500 text-sm"
                  />
                </div>

              </div>

              <div className="mt-5">
                <label className="block text-zinc-500 text-xs font-bold mb-1.5 uppercase tracking-wide">Summary</label>
                <textarea
                  value={scheme.summary || ""}
                  onChange={(e) => {
                    const updated = [...schemes];
                    updated[index] = { ...updated[index], summary: e.target.value };
                    setSchemes(updated);
                  }}
                  onBlur={() => updateScheme(scheme.id, "summary", scheme.summary)}
                  rows={4}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 text-sm resize-y"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-5">
                {[
                  { label: "Retirement", key: "retirementSupport" },
                  { label: "Insurance", key: "insurance" },
                  { label: "Medical", key: "medicalCoverage" },
                ].map(({ label, key }) => (
                  <div key={key} className="bg-black border border-zinc-800 rounded-xl p-3 text-center">
                    <p className="text-zinc-600 text-xs mb-1">{label}</p>
                    <p className={`font-black text-sm ${scheme[key] ? "text-green-400" : "text-zinc-700"}`}>
                      {scheme[key] ? "YES" : "NO"}
                    </p>
                  </div>
                ))}
              </div>

            </div>

          ))}

        </div>

        {schemes.length === 0 && (
          <div className="text-center py-24 text-zinc-700">
            <p className="text-2xl font-bold">No schemes in Firebase yet</p>
            <p className="text-sm mt-2">Use Quick Load to upload EPF, CIT, or SSF data</p>
          </div>
        )}

      </div>

    </main>

  );

}
