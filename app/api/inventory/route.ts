import { NextResponse } from "next/server";
import Papa from "papaparse";

const SHEET_ID = "1JTkLQm_TizEQxT5QVRCJWA3rHyjzkr8zF3I8d19ZCEo";
const INVENTORY_TABS = ["MASTER_INVENTORY"];
const TRACKER_TAB = "TrackerLogs";
const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 600;

function buildUrl(tab: string): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, tab: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[Inventory] Fetching tab "${tab}" — attempt ${attempt}/${MAX_RETRIES}`
      );
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      console.log(`[Inventory] ✓ Tab "${tab}" fetched (${text.length} bytes)`);
      return text;
    } catch (err) {
      console.warn(
        `[Inventory] ✗ Attempt ${attempt} failed for tab "${tab}": ${err}`
      );
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`[Inventory] Retrying in ${delay}ms…`);
        await sleep(delay);
      } else {
        console.error(
          `[Inventory] All ${MAX_RETRIES} attempts exhausted for tab "${tab}".`
        );
        throw err;
      }
    }
  }
  throw new Error("Unreachable");
}

function parseCsv(csv: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });
  if (result.errors.length > 0) {
    console.warn("[Inventory] CSV parse warnings:", result.errors.slice(0, 3));
  }
  return result.data;
}

export async function GET() {
  try {
    // Fetch all inventory tabs + tracker tab in parallel (max concurrency)
    const inventoryPromises = INVENTORY_TABS.map((tab) =>
      fetchWithRetry(buildUrl(tab), tab)
        .then(parseCsv)
        .catch((err) => {
          console.warn(`[Inventory] Skipping tab "${tab}" after all retries: ${err}`);
          return [] as Record<string, string>[];
        })
    );

    const trackerPromise = fetchWithRetry(buildUrl(TRACKER_TAB), TRACKER_TAB)
      .then(parseCsv)
      .catch((err) => {
        console.warn(`[Inventory] TrackerLogs unavailable: ${err}`);
        return [] as Record<string, string>[];
      });

    const [inventoryChunks, trackerLogs] = await Promise.all([
      Promise.all(inventoryPromises),
      trackerPromise,
    ]);

    // Merge all inventory tabs into one flat array; filter out completely empty rows
    const inventory = inventoryChunks
      .flat()
      .filter((row) => Object.values(row).some((v) => v?.trim() !== ""));

    console.log(
      `[Inventory] Done — ${inventory.length} inventory rows, ${trackerLogs.length} tracker rows`
    );

    return NextResponse.json({ inventory, trackerLogs });
  } catch (err) {
    console.error("[Inventory] Fatal error:", err);
    return NextResponse.json(
      { error: "Impossible de récupérer les données d'inventaire." },
      { status: 500 }
    );
  }
}
