"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ChatAssistant from "@/components/ChatAssistant";
import InventoryDashboard from "@/components/InventoryDashboard";
import type { InventoryItem, TrackerLog } from "@/lib/types";

export type ActiveView = "chat" | "dashboard";

export default function Home() {
  const [activeView, setActiveView] = useState<ActiveView>("chat");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [trackerLogs, setTrackerLogs] = useState<TrackerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInventory() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/inventory");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setInventory(data.inventory ?? []);
        setTrackerLogs(data.trackerLogs ?? []);
      } catch (err) {
        setError("Impossible de charger l'inventaire. Vérifiez votre connexion.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadInventory();
  }, []);

  return (
    <div className="flex h-full">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-800">
              {activeView === "chat" ? "💬 Chat Assistant" : "📊 Inventory Dashboard"}
            </span>
          </div>
          {loading && (
            <span className="ml-auto text-xs text-slate-400 flex items-center gap-1.5">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Chargement de l'inventaire…
            </span>
          )}
          {!loading && !error && (
            <span className="ml-auto text-xs text-emerald-600 font-medium">
              ✓ {inventory.length} composants chargés
            </span>
          )}
          {error && (
            <span className="ml-auto text-xs text-red-500">{error}</span>
          )}
        </header>

        <div className="flex-1 overflow-hidden">
          {activeView === "chat" ? (
            <ChatAssistant inventory={inventory} loading={loading} />
          ) : (
            <InventoryDashboard inventory={inventory} trackerLogs={trackerLogs} loading={loading} />
          )}
        </div>
      </main>
    </div>
  );
}
