# RailGrid — Full Build Plan
**x402 Hackathon · India DevRetreat · Algorand · June 2026 · 3-hour sprint**

---

## What We're Building

A pay-per-second GPU compute marketplace. Users (or AI agents) browse available GPU nodes, get a cost estimate, pay in ALGO via x402, and a job runs. No account. No credit card. One HTTP call.

The "GPU job" is **mocked** for the hackathon — the server simulates work with a timer and returns a canned output. But the payment, the blockchain record, and the API are all real.

---

## GPU Jobs — What Users Actually Submit

These are the tasks a user or AI agent can send to RailGrid.

| `task_type` | What it represents | Mock output returned | Approx duration |
|---|---|---|---|
| `image_generation` | Run Stable Diffusion to generate an image from a text prompt | Random image URL (picsum.photos) | 12–18s |
| `text_inference` | Run LLaMA / Mistral to answer a question or summarise a doc | Hardcoded LLM-style response string | 3–6s |
| `video_render` | Render a short animation or apply a GPU video effect | Link to a sample .mp4 | 30–60s |
| `3d_render` | Render a Blender scene with N samples | Link to a sample .png render | 20–45s |
| `object_detection` | Run YOLOv8 on a batch of images, return bounding boxes | Hardcoded detection JSON array | 5–10s |
| `fine_tuning` | Fine-tune a small model on a dataset (LoRA adapter) | Mock adapter file URL | 90–180s |

**Example user story:**
> "I want to generate an image of a sunset over Mumbai."
> → Select `image_generation`, 30 steps → Estimate → pay 0.001 ALGO → see cost (~0.042 ALGO, ~14s)
> → Run Job → pay 0.042 ALGO → wait 14s → image appears → LoRa receipt link on-chain

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      Browser (React + Vite frontend)                  │
│                                                                        │
│   ┌─────────────┐   ┌─────────────────┐   ┌──────────────────────┐  │
│   │  Providers  │   │    Estimator    │   │      Job Runner      │  │
│   │    Panel    │   │      Panel      │   │        Panel         │  │
│   │             │   │                 │   │                      │  │
│   │ GET         │   │ POST /estimate  │   │ POST /jobs/run       │  │
│   │ /providers  │   │ (x402 0.001     │   │ (x402 dynamic ALGO)  │  │
│   │             │   │  ALGO)          │   │                      │  │
│   │ Shows GPU   │   │ Shows: ~14s     │   │ Polls GET /jobs/:id  │  │
│   │ name, price │   │ ~0.042 ALGO     │   │ Shows output +       │  │
│   │ /sec, avail │   │ RTX 3090        │   │ LoRa receipt badge   │  │
│   └─────────────┘   └─────────────────┘   └──────────────────────┘  │
│         │                   │                          │              │
│         │         Pera Wallet popup (user signs tx)    │              │
└─────────┼───────────────────┼──────────────────────────┼─────────────┘
          │ HTTP              │ HTTP                     │ HTTP
          ▼                   ▼                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Hono Server (Node.js + TypeScript)                  │
│                                                                        │
│   paymentMiddleware(@x402/hono)                                        │
│   ┌─────────────────────────────────────────────────────────────┐     │
│   │ On first call: return HTTP 402 + payment details            │     │
│   │ On retry with X-Payment header: verify → run handler        │     │
│   └─────────────────────────────────────────────────────────────┘     │
│                                                                        │
│   handlers/                                                            │
│   ├── providers.ts       GET /providers, GET /providers/:id            │
│   ├── estimate.ts        POST /estimate  (x402 — 0.001 ALGO)           │
│   ├── jobs-run.ts        POST /jobs/run  (x402 — dynamic ALGO)         │
│   │                      GET  /jobs/:id  (free — poll for status)      │
│   ├── provider-reg.ts    POST /provider/register (x402 — 0.05 ALGO)    │
│   └── jobs-receipt.ts    GET  /jobs/:id/receipt  (free)                │
│                                                                        │
│   In-memory stores (survive server lifetime, reset on restart):        │
│   ├── providers Map<id, Provider>   ← seeded with 3 fake GPU nodes     │
│   └── jobs Map<id, Job>             ← created when /jobs/run called    │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ HTTPS — verify payment
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│              GoPlausible Facilitator (Algorand TestNet)                │
│              https://facilitator.goplausible.xyz                       │
│                                                                        │
│  Receives the X-Payment proof header from the server                   │
│  Checks the Algorand TestNet blockchain to confirm the tx happened     │
│  Returns OK → server proceeds to run the handler                       │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ on-chain record
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   Algorand TestNet blockchain                           │
│   Every x402 payment = real Algorand tx with a real tx ID             │
│   Visible at: https://lora.algokit.io/testnet/transaction/{txId}      │
└──────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │              MCP Server  (railgrid-mcp/)                 │
  │              @modelcontextprotocol/sdk                   │
  │                                                          │
  │  Tools exposed to Claude / Cursor / any LLM:            │
  │  list_providers  →  GET /providers                       │
  │  estimate_job    →  POST /estimate  (auto-signs x402)    │
  │  run_job         →  POST /jobs/run  (auto-signs x402)    │
  │  get_receipt     →  GET /jobs/:id/receipt                │
  │  cancel_job      →  POST /jobs/cancel                    │
  │                                                          │
  │  Reads ALGO_MNEMONIC from env to sign payments           │
  │  No human wallet needed — LLM pays autonomously          │
  └─────────────────────────────────────────────────────────┘
```

---

## Mock Job Execution (How Jobs "Run")

There is no real GPU involved. The server simulates it:

```
POST /jobs/run  →  x402 payment verified
        ↓
Server calculates duration using same heuristic as /estimate
Server writes job to Map with status: "running"
Server calls setTimeout(duration_ms, markComplete)
Server returns immediately: { job_id, status: "running", estimated_seconds }
        ↓  (client polls GET /jobs/:id every 2 seconds)
After setTimeout fires:
  job.status = "complete"
  job.output = MOCK_OUTPUTS[task_type]   ← hardcoded per task
  job.cost_algo = actual_seconds × price_per_second
        ↓
Client sees status "complete", renders output
```

**Mock output map** (in `jobs-run.ts`):
```typescript
const MOCK_OUTPUTS = {
  image_generation: { type: 'image',  url: 'https://picsum.photos/seed/railgrid/512/512' },
  text_inference:   { type: 'text',   url: '', preview: 'Mocked LLM response from GPU node.' },
  video_render:     { type: 'video',  url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  '3d_render':      { type: 'image',  url: 'https://picsum.photos/seed/blender/512/512' },
  object_detection: { type: 'json',   url: '', preview: '[{"label":"person","confidence":0.97}]' },
  fine_tuning:      { type: 'file',   url: 'https://example.com/mock-lora-adapter.bin' },
}
```

---

## x402 Payment Flow (Every Gated Endpoint)

```
1. Client sends request (e.g. POST /estimate)
2. Server has no X-Payment header → returns HTTP 402:
   {
     "x402Version": 1,
     "accepts": [{ "scheme": "exact", "network": "algorand-testnet",
                   "maxAmountRequired": "1000",   ← microALGO
                   "asset": "ALGO",
                   "payTo": "<AVM_ADDRESS>",
                   "facilitator": "https://facilitator.goplausible.xyz" }]
   }
3. Client (wallet / MCP server) signs an Algorand tx for that amount
4. Client retries the same request with header:
   X-Payment: <base64-encoded payment proof>
5. paymentMiddleware calls GoPlausible to verify the tx on-chain
6. Verification passes → handler runs → real response returned
```

---

## x402 Endpoints

### Free (no payment required)

| Method | Route | What it returns |
|---|---|---|
| GET | `/providers` | Array of all registered GPU nodes |
| GET | `/providers/:id` | Single node details + benchmark score |
| GET | `/jobs/:id` | Job status + output when complete |
| GET | `/jobs/:id/receipt` | On-chain receipt with LoRa explorer link |
| GET | `/health` | `{ status: "ok" }` |

### Payment-gated (x402)

| Method | Route | Price | Purpose |
|---|---|---|---|
| POST | `/estimate` | 0.001 ALGO | Get duration + cost before committing |
| POST | `/jobs/run` | dynamic (= max_algo cap) | Submit task, pay upfront, get output |
| POST | `/provider/register` | 0.05 ALGO | Stake to list a new GPU node |
| POST | `/jobs/cancel` | 0.002 ALGO | Cancel running job, get partial refund info |

---

## Data Models

```typescript
interface Provider {
  id: string               // "node_rtx3090"
  gpu: string              // "RTX 3090"
  vram_gb: number          // 24
  price_per_second: number // 0.003  (ALGO)
  benchmark_score: number  // 1–100, used by estimator heuristic
  available: boolean
  registered_at: string    // ISO timestamp
}

interface Job {
  id: string               // "job_1718271234"
  task_type: string        // "image_generation"
  provider_id: string
  status: 'running' | 'complete' | 'cancelled'
  started_at: string
  completed_at?: string
  duration_seconds?: number
  cost_algo?: number       // actual cost (may be < max_algo cap)
  tx_id: string            // Algorand tx ID from x402 payment
  explorer_url: string     // lora.algokit.io/testnet/transaction/{tx_id}
  output?: { type: string; url: string; preview?: string }
}
```

---

## Estimator Heuristic

`/estimate` and `/jobs/run` both use the same formula so the estimate is always consistent with actual mock duration:

```typescript
const TASK_COMPLEXITY = {
  image_generation: 1.2,
  text_inference:   0.3,
  video_render:     2.5,
  '3d_render':      2.0,
  object_detection: 0.8,
  fine_tuning:      4.0,
}

function estimateDuration(task_type, steps = 30, benchmark_score): number {
  const base = 5                             // minimum seconds
  const complexity = TASK_COMPLEXITY[task_type] ?? 1.0
  const throughput = benchmark_score / 100   // 0.6 – 1.0
  const stepFactor = steps / 30
  return Math.ceil((base / throughput) * complexity * stepFactor)
}

// e.g. image_generation, 30 steps, RTX 3090 (score 85):
// ceil((5 / 0.85) * 1.2 * 1.0) = ceil(7.06) = 8s  → cost = 8 × 0.003 = 0.024 ALGO
```

---

## File Structure

```
x402-Project/                              ← fork of marotipatre/x402-Project
│
├── x402-demo-server/
│   ├── index.ts                           ← MODIFY: add route imports + registrations
│   ├── endpoints.config.ts                ← MODIFY: add /estimate, /jobs/run, /provider/register
│   ├── .env                               ← confirm AVM_ADDRESS is set
│   └── handlers/                          ← ADD all of these (new directory):
│       ├── providers.ts                   in-memory registry + GET /providers routes
│       ├── estimate.ts                    heuristic + POST /estimate handler
│       ├── jobs-run.ts                    mock runner + POST /jobs/run + GET /jobs/:id
│       ├── provider-register.ts           POST /provider/register handler
│       └── jobs-receipt.ts                GET /jobs/:id/receipt handler
│
├── X402-Usecase/                          ← existing React frontend
│   └── src/
│       └── components/
│           └── RailGrid.tsx               ← ADD: 3-panel component
│
└── railgrid-mcp/                          ← ADD entire new directory
    ├── package.json
    └── index.ts                           MCP server (5 tools)
```

**Never touch:**
- `x402-demo-server/index.ts` — only add import + route lines, don't touch middleware setup
- `.gitmodules`
- `402-demo-client/` submodule

---

## Phase Build Plan (180 min)

### Phase 1 — Setup (0–20 min)

```bash
git clone https://github.com/marotipatre/x402-Project
cd x402-Project/x402-demo-server && npm install
cd ../X402-Usecase && npm install
```

Confirm `.env` has:
```env
AVM_ADDRESS=<testnet wallet address>
FACILITATOR_URL=https://facilitator.goplausible.xyz
PORT=3000
```

Start both:
```bash
# terminal 1
cd x402-demo-server && npm run dev

# terminal 2
cd X402-Usecase && npm run dev
```

Check: `GET http://localhost:3000/health` → `{ "status": "ok" }`

---

### Phase 2 — Providers Registry (20–40 min)

**New file:** `x402-demo-server/handlers/providers.ts`

```typescript
export interface Provider {
  id: string; gpu: string; vram_gb: number
  price_per_second: number; benchmark_score: number
  available: boolean; registered_at: string
}

const store = new Map<string, Provider>()

// Seed data — demo works immediately without anyone registering
store.set('node_rtx3090', { id: 'node_rtx3090', gpu: 'RTX 3090', vram_gb: 24,
  price_per_second: 0.003, benchmark_score: 85, available: true,
  registered_at: new Date().toISOString() })
store.set('node_rtx4080', { id: 'node_rtx4080', gpu: 'RTX 4080', vram_gb: 16,
  price_per_second: 0.004, benchmark_score: 92, available: true,
  registered_at: new Date().toISOString() })
store.set('node_a100',    { id: 'node_a100',    gpu: 'A100',     vram_gb: 80,
  price_per_second: 0.012, benchmark_score: 99, available: false,
  registered_at: new Date().toISOString() })

export const getProviders = () => [...store.values()]
export const getProvider  = (id: string) => store.get(id)
export const addProvider  = (p: Provider) => store.set(p.id, p)
```

**Add to `index.ts`:**
```typescript
import { getProviders, getProvider } from './handlers/providers'
app.get('/providers',    (c) => c.json(getProviders()))
app.get('/providers/:id',(c) => {
  const p = getProvider(c.req.param('id'))
  return p ? c.json(p) : c.json({ error: 'not found' }, 404)
})
```

---

### Phase 3 — Estimator Endpoint (40–75 min)

**New file:** `x402-demo-server/handlers/estimate.ts`

```typescript
import { getProvider, getProviders } from './providers'

const TASK_COMPLEXITY: Record<string, number> = {
  image_generation: 1.2, text_inference: 0.3,
  video_render: 2.5,     '3d_render': 2.0,
  object_detection: 0.8, fine_tuning: 4.0,
}

export function estimateDuration(task_type: string, steps: number, score: number): number {
  const base = 5
  const c = TASK_COMPLEXITY[task_type] ?? 1.0
  return Math.ceil((base / (score / 100)) * c * (steps / 30))
}

export async function handleEstimate(c: any) {
  const { task_type, steps = 30, provider_id } = await c.req.json()
  const provider = (provider_id ? getProvider(provider_id) : null)
    ?? getProviders().find(p => p.available)
  if (!provider) return c.json({ error: 'no provider available' }, 400)

  const seconds = estimateDuration(task_type, steps, provider.benchmark_score)
  return c.json({
    estimated_seconds: seconds,
    estimated_algo: +(seconds * provider.price_per_second).toFixed(4),
    price_per_second: provider.price_per_second,
    confidence: 'high',
    provider: provider.id,
    gpu: provider.gpu,
  })
}
```

**Add to `endpoints.config.ts`:**
```typescript
{ path: '/estimate', method: 'POST', price: { amount: 0.001, asset: 'ALGO' } }
```

**Add to `index.ts`:**
```typescript
import { handleEstimate } from './handlers/estimate'
app.post('/estimate', paymentMiddleware(...), handleEstimate)
```

---

### Phase 4 — Job Run Endpoint (75–120 min)

**New file:** `x402-demo-server/handlers/jobs-run.ts`

```typescript
import { estimateDuration } from './estimate'
import { getProvider, getProviders } from './providers'

const MOCK_OUTPUTS: Record<string, { type: string; url: string; preview?: string }> = {
  image_generation: { type: 'image',  url: 'https://picsum.photos/seed/railgrid/512/512' },
  text_inference:   { type: 'text',   url: '', preview: 'Mocked LLM response from GPU node.' },
  video_render:     { type: 'video',  url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  '3d_render':      { type: 'image',  url: 'https://picsum.photos/seed/blender/512/512' },
  object_detection: { type: 'json',   url: '', preview: '[{"label":"person","confidence":0.97}]' },
  fine_tuning:      { type: 'file',   url: 'https://example.com/mock-lora-adapter.bin' },
}

interface Job {
  id: string; task_type: string; provider_id: string
  status: 'running' | 'complete' | 'cancelled'
  started_at: string; completed_at?: string
  duration_seconds?: number; cost_algo?: number
  tx_id: string; explorer_url: string
  output?: { type: string; url: string; preview?: string }
}

export const jobs = new Map<string, Job>()

export async function handleJobRun(c: any) {
  const { task_type, steps = 30, provider_id, max_algo } = await c.req.json()

  // x402 middleware attaches verified payment info to context
  const tx_id = c.get('x402TxId') ?? `mock_tx_${Date.now()}`

  const provider = (provider_id ? getProvider(provider_id) : null)
    ?? getProviders().find(p => p.available)!
  const seconds = estimateDuration(task_type, steps, provider.benchmark_score)

  const job: Job = {
    id: `job_${Date.now()}`,
    task_type, provider_id: provider.id,
    status: 'running',
    started_at: new Date().toISOString(),
    tx_id,
    explorer_url: `https://lora.algokit.io/testnet/transaction/${tx_id}`,
  }
  jobs.set(job.id, job)

  // Mock GPU execution
  setTimeout(() => {
    const j = jobs.get(job.id)!
    j.status = 'complete'
    j.completed_at = new Date().toISOString()
    j.duration_seconds = seconds
    j.cost_algo = +(seconds * provider.price_per_second).toFixed(4)
    j.output = MOCK_OUTPUTS[task_type] ?? { type: 'text', url: '', preview: 'Job complete.' }
  }, seconds * 1000)

  return c.json({ job_id: job.id, tx_id, explorer_url: job.explorer_url,
                  status: 'running', estimated_seconds: seconds })
}

export function handleJobStatus(c: any) {
  const job = jobs.get(c.req.param('id'))
  return job ? c.json(job) : c.json({ error: 'not found' }, 404)
}
```

**Add to `endpoints.config.ts`:**
```typescript
{ path: '/jobs/run', method: 'POST', price: 'dynamic' }
```

**Add to `index.ts`:**
```typescript
import { handleJobRun, handleJobStatus } from './handlers/jobs-run'
app.post('/jobs/run', paymentMiddleware(...), handleJobRun)
app.get('/jobs/:id',  handleJobStatus)
```

---

### Phase 5 — Provider Register (120–140 min)

**New file:** `x402-demo-server/handlers/provider-register.ts`

```typescript
import { addProvider } from './providers'

export async function handleProviderRegister(c: any) {
  const { gpu, vram_gb = 8, price_per_second, endpoint_url } = await c.req.json()
  const id = `node_${gpu.replace(/\s+/g,'_').toLowerCase()}_${Date.now()}`
  const provider = {
    id, gpu, vram_gb, price_per_second,
    benchmark_score: Math.floor(Math.random() * 40) + 60,
    available: true,
    registered_at: new Date().toISOString(),
  }
  addProvider(provider)
  return c.json({ provider_id: id, message: 'registered', provider })
}
```

**Add to `endpoints.config.ts`:**
```typescript
{ path: '/provider/register', method: 'POST', price: { amount: 0.05, asset: 'ALGO' } }
```

---

### Phase 6 — MCP Server (140–165 min)

```bash
mkdir railgrid-mcp && cd railgrid-mcp
npm init -y
npm install @modelcontextprotocol/sdk node-fetch
```

**`railgrid-mcp/index.ts`** — exposes all endpoints as LLM tools. Each tool that hits an x402 endpoint auto-signs the payment using `ALGO_MNEMONIC` from env:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const BASE = process.env.RAILGRID_URL ?? 'http://localhost:3000'

const server = new Server(
  { name: 'railgrid', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

// Tools: list_providers, estimate_job, run_job, get_receipt, cancel_job
// Each tool wraps the HTTP call. x402 calls auto-pay via ALGO_MNEMONIC.
```

**MCP config for Cursor / Claude Desktop:**
```json
{
  "mcpServers": {
    "railgrid": {
      "command": "node",
      "args": ["railgrid-mcp/dist/index.js"],
      "env": { "ALGO_MNEMONIC": "your 25 words", "RAILGRID_URL": "http://localhost:3000" }
    }
  }
}
```

---

### Phase 7 — Frontend UI (165–180 min)

Add `RailGrid.tsx` to the existing React app. Three panels:

**Panel 1 — Providers**
- On mount: fetch `GET /providers`
- Render a card per node: GPU name, VRAM, price/sec, availability pill
- "Select" button sets the active provider for Estimator + Job Runner

**Panel 2 — Estimator**
- Dropdown: `task_type` (all 6 options)
- Slider: `steps` (10–100, default 30)
- Button: "Estimate Cost" → x402 wallet popup → show result card:
  `~14s · 0.042 ALGO · RTX 3090 · High confidence`
- Show LoRa badge (clickable link to the 0.001 ALGO payment tx)

**Panel 3 — Job Runner**
- Pre-filled from Estimator result
- Button: "Run Job" → x402 wallet popup → job created
- Progress bar that counts down `estimated_seconds`
- Poll `GET /jobs/:id` every 2s
- On `status === "complete"`:
  - `image` → render `<img src={output.url}>`
  - `text` / `json` → render in `<pre>`
  - `video` → render `<video src={output.url}>`
  - `file` → show download link
- LoRa receipt badge below output

---

## Environment Variables

```env
# x402-demo-server/.env
AVM_ADDRESS=<testnet wallet address that receives payments>
FACILITATOR_URL=https://facilitator.goplausible.xyz
PORT=3000

# railgrid-mcp/ (can use .env or inline in mcp.json)
ALGO_MNEMONIC=<25-word mnemonic — used to auto-sign x402 payments in MCP tools>
RAILGRID_URL=http://localhost:3000
```

---

## Full Request Lifecycle

```
─── ESTIMATE ────────────────────────────────────────────────────────────
User clicks "Estimate Cost"
  → POST /estimate  { task_type: "image_generation", steps: 30, provider_id: "node_rtx3090" }
  → Server: no X-Payment header → return 402 + payment details
  → Pera Wallet popup: "Pay 0.001 ALGO to RailGrid?"
  → User approves → Algorand TestNet tx broadcast
  → Frontend retries POST /estimate with X-Payment: <proof>
  → Server middleware calls GoPlausible → tx verified on-chain
  → Handler runs estimateDuration(task_type, steps, 85) → 8s
  → Response: { estimated_seconds: 8, estimated_algo: 0.024, gpu: "RTX 3090" }
  → UI shows result card + LoRa link for the 0.001 ALGO payment

─── RUN JOB ─────────────────────────────────────────────────────────────
User clicks "Run Job"
  → POST /jobs/run  { task_type: "image_generation", steps: 30, max_algo: 0.024 }
  → Same 402 → wallet → verify flow, but payment = 0.024 ALGO
  → Handler creates job { id: "job_1234", status: "running" }
  → setTimeout(8000, markComplete) fires in background
  → Response: { job_id: "job_1234", status: "running", estimated_seconds: 8 }

Frontend polls GET /jobs/job_1234 every 2s:
  t=2s  → { status: "running" }
  t=4s  → { status: "running" }
  t=8s  → { status: "complete", output: { type: "image", url: "https://picsum..." } }

UI renders image + LoRa receipt badge → judge clicks link → sees live tx on Algorand
```

---

## Tech Stack Summary

| Layer | Tech | Notes |
|---|---|---|
| Backend framework | Hono (Node.js + TS) | Already in marotipatre/x402-Project |
| x402 middleware | `@x402/hono` | Handles 402 challenge/response |
| Blockchain | Algorand TestNet | All payments on-chain |
| Facilitator | GoPlausible | Verifies Algorand txs |
| Frontend | React + Vite | Existing X402-Usecase project |
| Wallet | Pera Wallet | Signs user payment txs |
| MCP | `@modelcontextprotocol/sdk` | LLM tool integration |
| Tx explorer | LoRa | `lora.algokit.io/testnet` |
| Job execution | `setTimeout` mock | No real GPU needed for demo |

---

## Challenge Compliance Checklist

- [ ] 2+ working x402 endpoints with real business use case
- [ ] All payments on Algorand TestNet via GoPlausible facilitator
- [ ] Real transactions visible in LoRa explorer (clickable in UI)
- [ ] Problem clearly solved: permissionless GPU compute for agents
- [ ] MCP server lets any LLM call RailGrid autonomously
- [ ] Frontend shows full estimate → run → output flow

---

## Demo Script (3 min)

| Time | Say | Show |
|---|---|---|
| 0:00 | "RailGrid — pay-per-second GPU compute. No account. No credit card." | Landing / README |
| 0:20 | "Three GPU nodes on the grid. RTX 3090 at 0.003 ALGO per second." | Providers panel |
| 0:45 | "I want to run Stable Diffusion. First I estimate the cost." | Select image_generation |
| 1:00 | "Watch the wallet popup — I pay 0.001 ALGO for the estimate." | Wallet approves → result card |
| 1:20 | "8 seconds, 0.024 ALGO. Here's the on-chain payment right now." | Click LoRa badge → live tx |
| 1:40 | "I'm satisfied. Run the job." | Click Run Job → wallet approves |
| 1:55 | "Job is running. Polling the API. The payment is already on-chain." | Progress bar counting down |
| 2:10 | "Done. Here's the generated image and the receipt." | Image renders + receipt badge |
| 2:25 | "An AI agent — Claude, Cursor — can do this with zero human input via our MCP server." | MCP config or Claude demo |
| 2:50 | "Real payments. Real blockchain. Real business case. RailGrid." | Final |

---

*RailGrid · x402 Build Challenge · India DevRetreat · Algorand · June 2026*
