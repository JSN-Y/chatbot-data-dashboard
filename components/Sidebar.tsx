"use client";

import type { ActiveView } from "@/app/page";

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
}

const NAV_ITEMS: { id: ActiveView; label: string; icon: string; desc: string }[] = [
  {
    id: "chat",
    label: "Chat Assistant",
    icon: "💬",
    desc: "Stagiaire & Technicien",
  },
  {
    id: "dashboard",
    label: "Inventory Dashboard",
    icon: "📊",
    desc: "Prédiction & Export",
  },
];

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800">
      {/* Logo / Title */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="font-bold text-sm leading-tight text-white">
              Electronics AI
            </p>
            <p className="text-xs text-slate-400 leading-tight">
              Inventory Assistant
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium leading-tight ${
                    isActive ? "text-white" : ""
                  }`}
                >
                  {item.label}
                </p>
                <p className="text-[11px] text-slate-500 leading-tight truncate">
                  {item.desc}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <p className="text-[10px] text-slate-600 leading-snug">
          Données: Google Sheets
          <br />
          IA: Groq / Llama 4 Scout
        </p>
      </div>
    </aside>
  );
}
