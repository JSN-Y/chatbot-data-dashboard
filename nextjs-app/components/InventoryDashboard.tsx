"use client";

import { useRef, useMemo, useState } from "react";
import type { InventoryItem, TrackerLog } from "@/lib/types";
import { buildPredictions } from "@/lib/inventoryUtils";

interface InventoryDashboardProps {
  inventory: InventoryItem[];
  trackerLogs: TrackerLog[];
  loading: boolean;
}

type SortKey = "ref" | "description" | "quantity" | "daysRemaining";
type SortDir = "asc" | "desc";

export default function InventoryDashboard({
  inventory,
  trackerLogs,
  loading,
}: InventoryDashboardProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "daysRemaining",
    dir: "asc",
  });
  const [showAlertOnly, setShowAlertOnly] = useState(false);

  const predictions = useMemo(
    () => buildPredictions(inventory, trackerLogs),
    [inventory, trackerLogs]
  );

  const filtered = useMemo(() => {
    let rows = predictions;
    if (showAlertOnly) {
      rows = rows.filter(
        (r) => r.daysRemaining !== null && r.daysRemaining <= 7
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.ref.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)
      );
    }
    // Sort
    rows = [...rows].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sort.key === "daysRemaining") {
        // nulls last
        av = a.daysRemaining ?? Infinity;
        bv = b.daysRemaining ?? Infinity;
      } else if (sort.key === "quantity") {
        av = a.quantity;
        bv = b.quantity;
      } else if (sort.key === "ref") {
        av = a.ref.toLowerCase();
        bv = b.ref.toLowerCase();
      } else {
        av = a.description.toLowerCase();
        bv = b.description.toLowerCase();
      }
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [predictions, search, sort, showAlertOnly]);

  const alertCount = useMemo(
    () =>
      predictions.filter((r) => r.daysRemaining !== null && r.daysRemaining <= 7)
        .length,
    [predictions]
  );

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }

  async function handleExport() {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      // Dynamically import html2canvas (client-only)
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `inventaire-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("L'export a échoué. Veuillez réessayer.");
    } finally {
      setExporting(false);
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sort.key !== col) return <span className="text-slate-300 ml-1">↕</span>;
    return (
      <span className="text-indigo-500 ml-1">
        {sort.dir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-slate-400">
          <svg
            className="animate-spin h-8 w-8 mx-auto mb-3 text-indigo-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-sm">Chargement des données…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex flex-wrap items-center gap-3">
        {/* Alert badge */}
        {alertCount > 0 && (
          <button
            onClick={() => setShowAlertOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              showAlertOnly
                ? "bg-red-600 text-white"
                : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
            }`}
          >
            ⚠️ {alertCount} alerte{alertCount > 1 ? "s" : ""} ≤7j
          </button>
        )}

        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 min-w-[200px]">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <span className="text-xs text-slate-400">
          {filtered.length} / {predictions.length} composants
        </span>

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={exporting || predictions.length === 0}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {exporting ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Export…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Export Image
            </>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div ref={tableRef} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Dashboard header (visible in export) */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">
                📊 Inventaire Électronique — Dashboard Prédictif
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {predictions.length} composants · Mis à jour {new Date().toLocaleDateString("fr-FR")}
              </p>
            </div>
            {alertCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-red-100">
                ⚠️ {alertCount} composant{alertCount > 1 ? "s" : ""} critique{alertCount > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {predictions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-sm">Aucun composant trouvé dans l'inventaire.</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th
                    className="px-4 py-3 text-left font-semibold text-slate-600 cursor-pointer hover:text-slate-800 whitespace-nowrap"
                    onClick={() => toggleSort("ref")}
                  >
                    Référence <SortIcon col="ref" />
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-slate-600 cursor-pointer hover:text-slate-800"
                    onClick={() => toggleSort("description")}
                  >
                    Description <SortIcon col="description" />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">
                    Emplacement
                  </th>
                  <th
                    className="px-4 py-3 text-right font-semibold text-slate-600 cursor-pointer hover:text-slate-800 whitespace-nowrap"
                    onClick={() => toggleSort("quantity")}
                  >
                    Qté <SortIcon col="quantity" />
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">
                    Conso/jour
                  </th>
                  <th
                    className="px-4 py-3 text-right font-semibold text-slate-600 cursor-pointer hover:text-slate-800 whitespace-nowrap"
                    onClick={() => toggleSort("daysRemaining")}
                  >
                    Jours restants <SortIcon col="daysRemaining" />
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">
                    Datasheet
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((row) => {
                  const isAlert =
                    row.daysRemaining !== null && row.daysRemaining <= 7;
                  return (
                    <tr
                      key={row.ref}
                      className={`transition-colors ${
                        isAlert
                          ? "bg-red-50 hover:bg-red-100"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Ref */}
                      <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">
                        {isAlert && <span className="mr-1.5">⚠️</span>}
                        {row.ref}
                      </td>
                      {/* Description */}
                      <td className="px-4 py-2.5 text-slate-600 max-w-[220px] truncate">
                        {row.description || <span className="text-slate-300">—</span>}
                      </td>
                      {/* Address */}
                      <td className="px-4 py-2.5 text-slate-500 font-mono whitespace-nowrap">
                        {row.address || <span className="text-slate-300">—</span>}
                      </td>
                      {/* Quantity */}
                      <td
                        className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap ${
                          isAlert ? "text-red-700" : "text-slate-700"
                        }`}
                      >
                        {row.quantity}
                      </td>
                      {/* Avg daily usage */}
                      <td className="px-4 py-2.5 text-right text-slate-500 whitespace-nowrap">
                        {row.averageDailyUsage !== null
                          ? row.averageDailyUsage.toFixed(2)
                          : <span className="text-slate-300">—</span>}
                      </td>
                      {/* Days remaining */}
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {row.daysRemaining !== null ? (
                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isAlert
                                ? "bg-red-100 text-red-700"
                                : row.daysRemaining <= 30
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {Math.round(row.daysRemaining)}j
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Pas assez de données
                          </span>
                        )}
                      </td>
                      {/* Datasheet */}
                      <td className="px-4 py-2.5 text-center">
                        {row.datasheet ? (
                          <a
                            href={row.datasheet}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                            title={row.datasheet}
                          >
                            📄 PDF
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4 px-1 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-200"/>
            <span>≤ 7 jours — critique</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200"/>
            <span>≤ 30 jours — attention</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-200"/>
            <span>&gt; 30 jours — OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="italic">Pas assez de données</span>
            <span>= aucune entrée TrackerLogs pour ce composant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
