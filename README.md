# BridgeGuard AI

**Privacy-preserving cross-chain bridge security on Midnight.**

BridgeGuard AI is a privacy-preserving security and risk-assessment platform for
cross-chain bridge transfers. It helps users evaluate bridge risk before using a
bridge while keeping sensitive transfer inputs such as transfer amount, risk
tolerance and confidential intelligence private through Midnight zero-knowledge
technology.

> **Important:** BridgeGuard AI is **NOT itself a cross-chain bridge.** It does
> **not** directly transfer assets from Ethereum to Arbitrum. The actual asset
> transfer is performed by the selected cross-chain bridge. BridgeGuard AI works
> as a security / risk-assessment layer that runs *before* the bridge is used.

---

## Problem Statement

Cross-chain bridges allow assets to move between different blockchains, but
users may face:

- smart-contract vulnerabilities
- previous bridge incidents
- compromised bridges
- low liquidity
- high risk conditions
- difficulty comparing multiple bridges

Users need a way to evaluate bridge risk before transferring assets.

There is also a privacy problem: the exact transfer amount and the user's risk
preferences are sensitive information and should not unnecessarily become public
on a blockchain. Asking a service to evaluate a transfer usually means revealing
*how much* is being moved and *how much risk* the user can accept — data that
should stay private.

## Solution

The user wants to transfer **Ethereum → Arbitrum**. BridgeGuard AI steps in:

1. Shows the available registered bridges for the route.
2. Uses public bridge information such as TVL, audits, incidents, status and risk
   score.
3. Accepts private user inputs such as transfer amount and risk tolerance.
4. Evaluates the bridge using Midnight's privacy-preserving / zero-knowledge
   mechanism.
5. Discloses only the required coarse verdict and tolerance result.
6. The **AI Transfer Advisor** compares the available routes and provides a
   recommendation.
7. The user can then use the selected external cross-chain bridge for the actual
   asset transfer.

## How It Works

```
User
  ↓
Select Source Chain
  ↓
Select Destination Chain
  ↓
Select Bridge
  ↓
Enter Private Transfer Amount
  ↓
Set Private Risk Tolerance
  ↓
Private Risk Evaluation
  ↓
Midnight Zero-Knowledge Proof
  ↓
Coarse Risk Verdict
  ↓
AI Transfer Advisor
  ↓
Safer Bridge Recommendation
  ↓
Actual Cross-Chain Bridge
  ↓
Destination Chain
```

- **Select source / destination chains** — pick the route you want to take (for
  example Ethereum → Arbitrum).
- **Select a bridge** — the app shows the bridges registered on-chain for that
  route, with their public metadata and risk scores.
- **Enter private transfer amount** — the exact amount stays private.
- **Set private risk tolerance** — the user's acceptable risk level stays
  private.
- **Private risk evaluation** — a Midnight Compact contract combines the public
  bridge data with the private inputs and the confidential intel feed.
- **Midnight zero-knowledge proof** — the contract proves the result in zero
  knowledge; only the coarse outcome is disclosed on the ledger.
- **Coarse risk verdict** — the user sees `LOW / MEDIUM / HIGH / CRITICAL`
  without ever revealing the amount or tolerance that produced it.
- **AI Transfer Advisor** — compares routes and recommends the safer option.
- **Actual cross-chain bridge** — the user performs the real asset transfer
  through the chosen external bridge.

## Why Midnight?

BridgeGuard requires **both blockchain verification and privacy**. Midnight
allows the sensitive evaluation inputs to remain private while producing a
verifiable result on a public ledger.

**Private inputs:**
- transfer amount
- risk tolerance
- confidential intel

**Public / disclosed:**
- bridge information
- coarse verdict
- within-tolerance result
- required public ledger state

> Midnight is the **privacy and verification layer** of BridgeGuard. It does
> **not** perform the Ethereum → Arbitrum transfer — that happens through the
> selected external cross-chain bridge.

## Features

- **Dashboard** — live numbers from the ledger: registered bridges, confidential
  assessments, open alerts, average risk score, last verdict, per-bridge verdict
  history, TVL and safety ranking.
- **Bridge Analysis** — select source/destination chain and bridge, enter a
  private amount and risk tolerance, and run a real on-chain evaluation.
- **AI Transfer Advisor** — a transparent, rule-based decision-support engine
  that ranks candidate bridges using the real on-chain verdicts. It is *not*
  backed by an LLM or machine-learning model.
- **Liquidity Monitor** — on-chain TVL snapshot per bridge with a deterministic
  health score (audit, incidents, status, depth).
- **Whale Activity** — honest reporting: shows the real on-chain activity the
  contract records and clearly states when no whale-transfer feed is present.
- **Security Alerts** — derived from actual on-chain registry state and real
  `flagBridge` contract calls.
- **Midnight Wallet integration** — real DApp Connector connection with
  disconnect/reconnect and network-mismatch handling.
- **Bridge Registry** — register new bridges on-chain with public metadata.
- **On-chain Risk Evaluation** — every verdict is produced by a real
  `evaluateBridge` circuit call.
- **Zero-Knowledge Privacy** — transfer amount, tolerance and intel never appear
  on the ledger.
- **Risk Verdicts** — `LOW / MEDIUM / HIGH / CRITICAL` with a within-tolerance
  flag.
- **Route Comparison** — the AI Transfer Advisor compares routes side by side.
- **Settings** — persisted user preferences.
- **Error and loading states** — explicit feedback for wallet, proof, submission
  and network failures.
- **Real on-chain transactions** — registrations, evaluations and flags are
  submitted to Midnight as real transactions.

## Wallet

BridgeGuard AI uses a **Midnight/1AM-compatible wallet** through the official
**DApp Connector API** (`window.midnight`, never hardcoded wallet names). The
frontend:

- Detects an injected Midnight wallet (1AM preferred, any compatible wallet
  accepted).
- Requests the **Preview** network on `connect()`.
- Validates the connection via `getConnectionStatus()`.
- Reads the **real unshielded wallet address** and stores the session locally.
- Shows **Connected** with the shortened real `mn_…` address and a **Disconnect**
  option in the header.
- Handles **network mismatch**: a stale session persisted on another network is
  dropped on load, so the app can never fake a connection or auto-connect on the
  wrong network.
- Shows a clear "wallet not detected" error when no Midnight wallet is injected.

## Midnight Preview Deployment

**Network:** Midnight Preview

| Item | Value |
| --- | --- |
| Deployment status | **Contract deployed and verified on Midnight Preview** |
| Transaction submission | **Pending** — blocked because the Preview wallet currently holds **0 DUST** (gas token) |
| Contract ID | `4605c30c84eb05670aea8ae4d247aacf06982383d3f72fa568f2f839f22896ec` |
| Deployed at | `2026-08-08T08:08:46Z` |
| Deployer / service address (public) | `mn_addr_preview1acp47u6faardw9796f5dvg7glvvm07zflcea7dld0gyg4fup34dst02usu` |
| Backend | Runs locally via `npx tsx src/server.ts` → `http://localhost:3000` (Preview-connected; read-only ledger access works, transaction submission pending DUST) |
| Indexer | `https://indexer.preview.midnight.network/api/v4/graphql` (GraphQL WebSocket `wss://indexer.preview.midnight.network/api/v4/graphql/ws`) |
| Node / RPC | `https://rpc.preview.midnight.network` |
| Proof server | Local `http://127.0.0.1:6300` (docker-compose `proof-server` container; required for Preview proofs) |
| Frontend | Served by the backend (SPA fallback); Vite dev at `http://localhost:5173`. No public URL deployed. |

> **Status wording:** *Contract deployed to Midnight Preview; transaction
> submission is pending Preview wallet/DUST funding.* The wallet holds
> `5,000,000,000` tNIGHT on Preview, but its DUST balance is `0`, so
> `evaluateBridge` / `registerBridge` / `flagBridge` transactions cannot be
> submitted until DUST is available. Ledger reads (dashboard, registry, verdicts)
> work against Preview.

No private keys, seed phrases, mnemonics, passwords or API secrets are shown
here or anywhere in this repository's public files.

### Production Deployment (Railway & Vercel)

For production/demo hosting under Level 2, the app is deployed in a decoupled architecture:

#### A. Frontend UI (Vercel)
* **Hosting:** Deployed as a static single-page app (SPA).
* **Build Command:** `npm run frontend:build`
* **Output Directory:** `frontend/dist`
* **Environment Variables:**
  * `VITE_API_BASE`: Set to the public HTTP domain of the deployed Railway backend (e.g., `https://bridgeguard-api.railway.app`). Do not enter any wallet seeds or keys here.

#### B. Backend API (Railway)
* **Hosting:** Deployed as a persistent service container on Railway using the root `Dockerfile`.
* **Private State Sync:** LevelDB state is kept inside the container.
* **Environment Variables (Railway Secrets):**
  * `MIDNIGHT_WALLET_MNEMONIC`: The 24-word recovery phrase for the service wallet on Preview.
  * `PRIVATE_STATE_PASSWORD`: Encryption key (min 16 chars) to seal the private database on disk.
  * `MIDNIGHT_CONTRACT_ADDRESS`: The active contract address (`4605c30c84eb05670aea8ae4d247aacf06982383d3f72fa568f2f839f22896ec`).
  * `MIDNIGHT_PROOF_SERVER_URL`: Set to the Railway private internal URL of the proof-server (e.g. `http://proof-server:6300`).
  * `PORT`: Automatically assigned by Railway.
  * `NODE_ENV`: `production`

#### C. Proof Server (Railway Private Service)
* **Hosting:** A separate private container deployed on Railway using the public image `midnightntwrk/proof-server:8.1.0` with the start command `midnight-proof-server -v`.
* **Port Configuration:** Expose port `6300` internally via private networking. **Do NOT generate a public domain** or expose port `6300` to the internet. The backend connects directly through the secure internal DNS alias (e.g., `http://proof-server:6300`).

## Smart Contract

The contract lives in `contracts/bridgeguard-v2.compact` and is deployed to
Midnight Preview at the Contract ID listed above. It implements three circuits /
functions:

- **`registerBridge(name, srcChain, dstChain, tvl, audited, incidents)`** —
  stores **public bridge metadata**. The registry write discloses all metadata by
  design and derives the public base risk score.
- **`evaluateBridge(bridgeId, amount, maxRisk)`** — performs the
  **privacy-preserving risk evaluation** using private inputs. `amount` and
  `maxRisk` are private circuit parameters; the confidential intel feed is
  provided by the off-chain witness (`getRiskIntel`) from private state. Only the
  coarse verdict and the within-tolerance flag are disclosed.
- **`flagBridge(bridgeId, newStatus)`** — updates the **public bridge status**
  (`ACTIVE / FLAGGED / COMPROMISED`).

Pure helpers `computeBaseScore` and `computeVerdict` keep the math verifiable.
Contract properties: public ledger maps for the registry and verdict history,
counters, explicit `disclose()` boundaries, assertions on every input, and no
logging or emission of private inputs.

## Privacy Model

**Disclosed boundary:** `evaluateBridge` discloses only
`{ bridgeId, coarse verdict, within-tolerance }` — nothing else.

**Private (never written to the ledger, proved in zero knowledge):**
- the exact transfer `amount`
- the risk tolerance `maxRisk`
- the confidential `intel` feed value

**Public (on-chain, visible to every observer):**
- bridge metadata and the registry
- public risk information (TVL, audit status, incident count, base risk score,
  status)
- the coarse verdict and the within-tolerance result

The test suite includes dedicated tests asserting that the private `amount`,
`maxRisk` and `intel` values never appear in any ledger output.

> **Honest note on the intel feed:** the current intel feed is **user-provided
> through the UI** and is treated as a private witness input (never disclosed by
> the contract). It is **not yet connected to an external intelligence
> provider** — plugging one in is listed under **Future Scope**.

## Architecture

```
React Frontend
  ↓
Node / TypeScript Backend (src/server.ts)
  ↓
Midnight Preview
  ↓
BridgeGuard Compact Contract (bridgeguard-v2.compact)
```

The backend talks to Midnight Preview through the **Preview indexer** (GraphQL)
for ledger reads, the local **proof server** (http://127.0.0.1:6300) for
zero-knowledge proofs, and the Midnight JS SDK / **wallet (DApp Connector)** for
transaction submission.

```
┌──────────────┐    REST (same-origin /api/*)    ┌───────────────────────┐
│  React SPA   │ ────────────────────────────► │  Node backend        │
│  frontend/   │ ◄──────────────────────────── │  src/server.ts       │
└──────────────┘        JSON + tx refs         │  - API /api/state    │
                                               │  - API /api/health   │
If applicable, the SPA is served directly by   │  - API /api/register │
the backend (SPA fallback included).           │  - API /api/evaluate │
                                               │  - API /api/flag     │
                                               │  - Midnight JS SDK   │
                                               └──────────┬────────────┘
                                                          │
                    ┌─────────────────────────────────────┼───────────────────────┐
                    │                                     │                       │
           ┌────────▼────────┐              ┌─────────────▼──────────┐  ┌──────────▼─────────┐
           │  Midnight node  │              │  Preview indexer       │  │  Proof server      │
           │  (Preview RPC)  │              │  (GraphQL)             │  │  (http://127.0.0.1:6300)│
           └────────┬────────┘              └─────────────┬──────────┘  └──────────┬─────────┘
                    │                                     │                         │
                    └─────────────────────────────────────┼─────────────────────────┘
                                                          │
                                             ┌────────────▼────────────┐
                                             │  BridgeGuard contract   │
                                             │  (bridgeguard-v2.compact)│
                                             │  registry + verdicts    │
                                             └─────────────────────────┘
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Contract | Midnight **Compact** (`compact`, language v0.23) |
| SDK | `@midnight-ntwrk/midnight-js-*` (indexer provider, proof provider, wallet SDK), Compact runtime |
| Backend | Node.js, TypeScript, `tsx`, `ws`, no framework — plain `http` |
| Wallet | Midnight 1AM / compatible wallet via **DApp Connector API** |
| Public network | **Midnight Preview** (indexer, RPC) + local proof-server |
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS |
| Testing | vitest (in-process contract simulator), browser-driven E2E |

## Local Development

> **Local development configuration only — NOT the final submission
> deployment.** The final target is **Midnight Preview** (see the deployment
> section above). A local devnet is kept available for fast iteration.

Prereqs: Node ≥ 22, Docker (for the local devnet and the proof-server), npm.

```bash
# 1. Install dependencies including the frontend
npm install
npm --prefix frontend install

# 2. Start the local Midnight devnet (node, indexer, proof server)
docker compose up -d --wait

# 3. Compile the contract (writes contracts/managed/bridgeguard-v2)
npm run compile
```

### Running the backend + frontend locally

```bash
npx tsx src/server.ts          # API + SPA at http://localhost:3000
npm run frontend:dev           # (optional) Vite dev server at http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:3000` (see
`frontend/vite.config.ts`), so the same-origin API client works unchanged.

### API endpoints

- `GET /api/state` — full ledger snapshot + wallet info
- `GET /api/balance` — tNight + DUST balances
- `GET /api/health` — real connectivity probes (API, contract, indexer, node,
  proof server)
- `POST /api/register` — `registerBridge`
- `POST /api/evaluate` — private `evaluateBridge` (amount + tolerance stay
  private)
- `POST /api/flag` — `flagBridge`

### Deploying

```bash
# Active network is Midnight Preview (see .midnight-state.json). Preview needs
# only the local proof-server:  docker compose up -d proof-server
npx tsx src/deploy-v2.ts                          # active network (preview)
npx tsx src/deploy-v2.ts --network preview        # Midnight Preview
npx tsx src/deploy-v2.ts --network undeployed     # local devnet (development only)
npx tsx src/deploy-v2.ts --network preprod        # Midnight preprod
```

Deployment records (address + deployer) are kept in `.midnight-state.json`
(gitignored).

## Testing

```bash
npm test              # runs the contract simulator test suite (vitest)
```

The suite (`tests/bridgeguard.test.ts`) covers `registerBridge`, `evaluateBridge`
and `flagBridge`, plus dedicated **privacy-boundary** tests asserting the exact
`amount`, `maxRisk` and `intel` values never appear in any ledger output.

### Verified development results

- **Contract tests:** 16/16 PASS
- **E2E (local devnet):** 57/57 PASS — browser-driven suite exercising the
  running app against the live backend and devnet: dashboard, bridge analysis
  with real on-chain proofs, AI advisor, liquidity monitor, whale activity,
  security alerts (incl. a real `flagBridge` transaction), wallet, settings,
  navigation, 404 page and error handling.
- **TypeScript / typecheck:** PASS
- **Build:** PASS

> These E2E results were produced against the **local development devnet**. They
> verify application behaviour end-to-end but do **not** by themselves prove
> Preview transaction submission.

### Preview Verification

| Item | Status |
| --- | --- |
| Contract deployment | Verified on Preview (`4605c30c…22896ec`, 2026-08-08T08:08:46Z) |
| Preview wallet | Verified (`mn_addr_preview1acp47u6faardw9796f5dvg7glvvm07zflcea7dld0gyg4fup34dst02usu`, 5,000,000,000 tNIGHT) |
| Preview contract address | Verified |
| Preview transaction submission | **PENDING** — blocked by zero DUST |
| DUST funding | **0 DUST** — no DUST coins available; transactions fail until DUST is minted |

## Demo Flow

1. Open BridgeGuard AI.
2. Connect the Midnight wallet on **Preview**.
3. Open the **Dashboard**.
4. Select **Bridge Analysis**.
5. Choose a source and destination chain.
6. Select a registered bridge.
7. Enter the private transfer amount.
8. Set the private risk tolerance.
9. Analyze the bridge.
10. Show the risk verdict.
11. Show that the private inputs are **not** disclosed.
12. Open the **AI Transfer Advisor**.
13. Compare routes.
14. Show the **Liquidity Monitor**.
15. Show the **Security Alerts**.

> The actual cross-chain transfer happens through the **selected bridge**, not
> through BridgeGuard itself.

## Current Status

- **Development testing:** PASS (16/16 contract tests, 57/57 local-devnet E2E,
  typecheck and build)
- **Preview deployment:** contract deployed and verified on **Midnight Preview**
- **Preview transaction readiness:** **PENDING** — transaction submission is
  currently blocked because the Preview wallet has **0 DUST**. The project is
  **not** marked READY for Preview transaction submission until DUST funding is
  available.

## Future Scope

- Wire a real confidential **incident-intelligence provider** to feed the
  `getRiskIntel` witness automatically instead of manual input.
- Add a **whale-transfer monitoring circuit** on the contract (or read a real
  indexer-derived whale feed) so the Whales page reflects actual transfers.
- Richer indexer-driven **analytics**: verdict trending over time, liquidity
  history, cross-bridge anomaly detection.
- **Preview → preprod/mainnet**: deploy using the same
  `npx tsx src/deploy-v2.ts --network <network>` flow used for Preview.
- Optional **AI-assisted explanation layer** on top of the disclosed verdicts,
  keeping the on-chain boundary private (verdict only).
- Wallet-scoped **private state versioning** so verdict history can be replayed
  offline without re-disclosing anything.

---

*BridgeGuard AI — a privacy-preserving security and risk-assessment layer for
cross-chain bridges, built on Midnight.*
