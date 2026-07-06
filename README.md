# 🔬 AI Electronics Inventory Terminal

A full-stack Next.js web application designed specifically for electronics laboratories. This platform acts as an intelligent, real-time AI assistant for technicians and engineering interns. It reads live component inventory directly from a Google Spreadsheet, provides project mentoring, calculates predictive component usage, and generates instant datasheet links.

## ✨ Features

*   **Mode Stagiaire (Intern Mentor):** Interns can describe a project they want to build. The AI scans the lab's exact inventory and suggests which available components to use, providing their physical address in the lab.
*   **Mode Technicien (Quick Lookup):** Technicians can ask for specific parts. The AI will verify stock, provide the exact drawer/bin address, or suggest the closest available alternative.
*   **Smart Datasheet Links:** Every component query returns two links: a direct Google "I'm Feeling Lucky" PDF redirect, and a guaranteed Octopart search fallback.
*   **Predictive Analytics Dashboard:** Reads a hidden `TrackerLogs` tab from Google Sheets to calculate the daily burn rate of components. Automatically highlights rows in red if a component is predicted to run out within 7 days.
*   **Export Canvas:** Built-in tool to capture the dashboard UI and download it as a high-resolution image for offline reporting.
*   **Secure API Architecture:** Utilizes Next.js Server-Side API routes to ensure the Groq API key is never exposed to the client browser.

## 🛠 Tech Stack

*   **Frontend:** Next.js (App Router), React, Tailwind CSS
*   **Backend:** Next.js API Routes (Serverless)
*   **AI Engine:** Groq API (`meta-llama/llama-4-scout-17b-16e-instruct` for ultra-fast, accurate RAG)
*   **Database:** Google Sheets (Fetched directly via CSV endpoints)
*   **Utilities:** `html2canvas` (for dashboard exports)

## 🚀 Local Setup & Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
   cd your-repo-name
