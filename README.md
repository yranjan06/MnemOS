<img width="1213" height="441" alt="image" src="https://github.com/user-attachments/assets/e4bec6a9-3d1d-4878-b079-8a52f05a2489" />

# <p align="center"> Orbit: Open Source AI Desktop Agent </p>

A self-hosted tool for building computer use workflows on a real desktop inside Docker.

[![▶ Watch Demo](https://img.youtube.com/vi/R4SlZ8LntcU/maxresdefault.jpg)](https://youtu.be/R4SlZ8LntcU)

▶ [Watch the demo](https://youtu.be/R4SlZ8LntcU)

## What it does

- Scrape structured data from websites
- Fill and submit forms using credentials from a secrets vault
- Run Python inline with access to all previous step outputs
- Monitor pages on a schedule and branch based on what's on screen
- Chain any of the above into a single workflow
- Apply to Jobs

Runs in a Docker container with a full browser and desktop. You can watch it work over VNC, pause and take control, then hand back.

## Example workflows

Built-in templates you can load in one click:

| Template | What it does |
|----------|-------------|
| **Web Scrape** | Navigate to a page, extract structured fields |
| **Login & Fill** | Log in with saved credentials, fill and submit a form |
| **Retry Loop** | Run an action, check if it succeeded, retry if not |
| **Competitor Analysis** | Scrape pricing, models, and API costs across a list of competitors, analyse in terminal, output CSV + charts |
| **CSV Batch** | Load a CSV, loop over every row, perform an action per row |

## Quick start

```bash
git clone https://github.com/aadya940/orbit-ui
cd orbit-ui
cp .env.example .env
# Set GEMINI_API_KEY (or any supported LLM key)
docker compose up
```

Open **http://127.0.0.1:3000**

> **Windows:** use `127.0.0.1` not `localhost` — on Windows, `localhost` resolves to IPv6 and the connection will fail.

---

**Docs & more:** [orbit-cua.com](https://orbit-cua.com)
