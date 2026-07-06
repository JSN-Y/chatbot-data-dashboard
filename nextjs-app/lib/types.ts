export type ChatMode = "stagiaire" | "technician";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface InventoryItem {
  [key: string]: string;
}

export interface TrackerLog {
  [key: string]: string;
}

export interface ComponentPrediction {
  ref: string;
  description: string;
  quantity: number;
  address: string;
  datasheet: string;
  averageDailyUsage: number | null;
  daysRemaining: number | null;
  hasData: boolean;
}
