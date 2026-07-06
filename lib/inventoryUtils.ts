import type { InventoryItem, TrackerLog, ComponentPrediction } from "./types";

/**
 * Robust column finder: tries exact match, then case-insensitive substring match.
 * Works for both inventory and tracker rows.
 */
function findColumn(
  rows: Record<string, string>[],
  candidates: string[]
): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  for (const c of candidates) {
    // 1. Exact match
    if (keys.includes(c)) return c;
    // 2. Case-insensitive exact match
    const ci = keys.find((k) => k.trim().toLowerCase() === c.toLowerCase());
    if (ci) return ci;
    // 3. Case-insensitive contains match (e.g. "Component ref.N" inside "  Component ref.N  ")
    const contains = keys.find((k) =>
      k.trim().toLowerCase().includes(c.toLowerCase())
    );
    if (contains) return contains;
  }
  return keys[0] ?? "";
}

/** Read a field from a row using the pre-computed column key, with a safe fallback */
function getField(row: Record<string, string>, col: string): string {
  return (row[col] ?? "").trim();
}

/** Build prediction data by combining inventory with tracker usage stats */
export function buildPredictions(
  inventory: InventoryItem[],
  trackerLogs: TrackerLog[]
): ComponentPrediction[] {
  // --- Column discovery ---
  const refCandidates = [
    "Component ref.N",
    "Component Ref.N",
    "Ref",
    "Reference",
    "Part Number",
    "Part No",
    "Component",
  ];
  const descCandidates = [
    "Description",
    "Designation",
    "Component",
    "Name",
    "Label",
    "Désignation",
  ];
  const qtyCandidates = [
    "Quantity",
    "Qty",
    "Stock",
    "Quantité",
    "Quantite",
    "Qté",
  ];
  const addrCandidates = [
    "Address",
    "Location",
    "Emplacement",
    "Addr",
    "Localisation",
  ];
  const datasheetCandidates = [
    "Datasheet",
    "Fiche technique",
    "PDF",
    "Link",
    "URL",
  ];

  const trackerRefCandidates = [
    "Component ref.N",
    "Component Ref.N",
    "Ref",
    "Reference",
    "Part Number",
    "Component",
  ];
  const trackerQtyCandidates = [
    "Quantity Used",
    "Qty Used",
    "Quantité utilisée",
    "Quantite utilisee",
    "Used",
    "Quantity",
    "Qty",
  ];
  const trackerDateCandidates = [
    "Date",
    "date",
    "Timestamp",
    "Time",
    "DateTime",
    "Created",
  ];

  const refCol = findColumn(inventory, refCandidates);
  const descCol = findColumn(inventory, descCandidates);
  const qtyCol = findColumn(inventory, qtyCandidates);
  const addrCol = findColumn(inventory, addrCandidates);
  const dsCol = findColumn(inventory, datasheetCandidates);

  const tRefCol = findColumn(trackerLogs, trackerRefCandidates);
  const tQtyCol = findColumn(trackerLogs, trackerQtyCandidates);
  const tDateCol = findColumn(trackerLogs, trackerDateCandidates);

  // --- Group tracker logs by component ref ---
  interface UsageEntry {
    date: Date;
    qty: number;
  }
  const usageMap = new Map<string, UsageEntry[]>();

  for (const log of trackerLogs) {
    const ref = getField(log, tRefCol);
    const qtyStr = getField(log, tQtyCol).replace(",", ".");
    const dateStr = getField(log, tDateCol);
    if (!ref || !qtyStr || !dateStr) continue;

    const qty = parseFloat(qtyStr);
    const date = new Date(dateStr);
    if (isNaN(qty) || isNaN(date.getTime())) continue;

    if (!usageMap.has(ref)) usageMap.set(ref, []);
    usageMap.get(ref)!.push({ date, qty });
  }

  /** Average daily usage for a set of log entries */
  function calcAvgDailyUsage(entries: UsageEntry[]): number | null {
    if (!entries || entries.length === 0) return null;
    const totalUsed = entries.reduce((s, e) => s + e.qty, 0);
    if (entries.length === 1) return totalUsed; // single-day estimate
    const times = entries.map((e) => e.date.getTime());
    const daySpan = (Math.max(...times) - Math.min(...times)) / 86_400_000;
    if (daySpan <= 0) return totalUsed;
    return totalUsed / daySpan;
  }

  // --- Deduplicate inventory by ref (keep first occurrence) ---
  const seen = new Set<string>();
  const deduped: InventoryItem[] = [];
  for (const item of inventory) {
    const ref = getField(item, refCol);
    if (!ref) continue;
    if (seen.has(ref)) continue;
    seen.add(ref);
    deduped.push(item);
  }

  return deduped.map((item) => {
    const ref = getField(item, refCol);
    const description = getField(item, descCol);
    const quantity = parseFloat(getField(item, qtyCol).replace(",", ".")) || 0;
    const address = getField(item, addrCol);
    const datasheet = getField(item, dsCol);

    const entries = usageMap.get(ref);
    const avgUsage = calcAvgDailyUsage(entries ?? []);
    const daysRemaining =
      avgUsage !== null && avgUsage > 0 ? quantity / avgUsage : null;

    return {
      ref,
      description,
      quantity,
      address,
      datasheet,
      averageDailyUsage: avgUsage,
      daysRemaining,
      hasData: !!entries,
    } satisfies ComponentPrediction;
  });
}
