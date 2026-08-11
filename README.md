# BridgeGuard AI

**Privacy-preserving bridge risk evaluation on Midnight.**

BridgeGuard AI is a privacy-preserving bridge risk evaluation DApp built on
Midnight. It evaluates bridge risk using **public bridge information** combined
with **sensitive user inputs** inside a **Midnight Zero-Knowledge circuit**, and
writes only a coarse risk verdict to the public ledger.

> **Important:** BridgeGuard AI is **NOT itself a cross-chain bridge.** It does
> **not** transfer assets from one chain to another. The actual asset transfer is
> performed by the selected external cross-chain bridge. BridgeGuard AI works as
> a security / risk-evaluation layer that runs *before* the bridge is used.

---

## Core Problem

Users who want to move assets across chains need to judge whether a bridge is
safe to use. Simply asking a service "is this transfer risky?" normally means
revealing sensitive evaluation inputs:

- the **transfer amount**
- the user's **risk tolerance**
- **confidential intelligence data** about the bridge

The goal is to keep these sensitive inputs **off the public blockchain ledger**
while still producing a **verifiable coarse risk verdict**.

## Solution

1. The user selects a route and a registered bridge (public on-chain data: TVL,
   audit status, incidents, status, base risk score).
2. The user enters a private transfer amount and a private risk tolerance.
3. A Midnight Compact circuit (`evaluateBridge`) combines the public bridge data
   with the private inputs and a confidential intel witness.
4. A zero-knowledge proof is generated and verified on Midnight.
5. Only the **coarse verdict** (`LOW / MEDIUM / HIGH / CRITICAL`) and the
   **tolerance-fit result** are written to the ledger.
6. The frontend reads the verdict back and displays it, together with a
   transparent rule-based recommendation.

## How It Works

```
User
  ↓
BridgeGuard React frontend
  ↓
Private amount + maxRisk + confidential intel
  ↓
Backend prepares the transaction and generates the ZK proof
  ↓
1AM Wallet receives the prepared transaction
  ↓
User approves / signs the transaction
  ↓
1AM balances the transaction and pays the DUST fee
  ↓
Midnight Preview
  ↓
BridgeGuard v2 evaluateBridge() circuit
  ↓
Proof verification + ledger state transition
  ↓
Coarse on-chain verdict
  ↓
Frontend displays the result
```

## Technology Stack

| Layer | Technology |
| --- | --- |
| Smart contract | **Midnight Compact** (language v0.23, `contracts/bridgeguard-v2.compact`) |
| ZK infrastructure | **Midnight ZK circuits**, Compact runtime, managed prover/verifier keys |
| Network | **Midnight Preview** (indexer + RPC) |
| Wallet | **1AM Wallet** via the official **Midnight DApp Connector API** (`window.midnight`); Lace supported as backward compatibility |
| SDK | `@midnight-ntwrk/midnight-js-*` providers, `@midnight-ntwrk/dapp-connector-api` |
| Backend | Node.js, TypeScript, plain `http` server (`src/server.ts`) |
| Proof server | Local `midnight-proof-server` container (`http://127.0.0.1:6300`) |
| Indexer | Preview indexer (GraphQL, `https://indexer.preview.midnight.network/api/v4/graphql`) |
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS |
| Testing | vitest (in-process contract simulator), Node-based wallet simulation, live 1AM browser test |

## Architecture

```
User
  ↓
BridgeGuard React frontend  (frontend/src/pages/BridgeAnalysis.tsx)
  ↓  private amount + maxRisk + intel  (REST /api/*)
Node/TypeScript backend  (src/server.ts)
  ↓  prepares unproven call tx + generates ZK proof (proof server)
1AM Wallet  (DApp Connector ConnectedAPI)
  ↓  user approval, balancing, DUST fee, submission
Midnight Preview  (indexer / RPC)
  ↓
BridgeGuard v2 evaluateBridge() circuit
  ↓  proof verification + ledger state transition
Coarse on-chain verdict  →  read back via indexer  →  frontend
```

The **backend acts as a trusted prover**: it receives the private inputs,
prepares the transaction and generates the zero-knowledge proof. The wallet
balances and signs the *already proven* transaction and pays the DUST fee. The
backend can see the private inputs in memory during transaction preparation —
it does not write them to the ledger and never logs or returns them.

## Zero-Knowledge Privacy

### Private inputs

- `amount` — the transfer amount (a private circuit parameter)
- `maxRisk` — the user's risk tolerance 0–3 (a private circuit parameter)
- `intel` — the confidential intelligence feed, obtained through the private
  witness `getRiskIntel()` from the contract's private state

These values are consumed inside the proof and are **not disclosed into the
public ledger** by `evaluateBridge()`.

### Public information

The public ledger can contain:

- the bridge registry (name, chains, TVL, audited, incidents, risk score,
  status)
- the coarse verdict per evaluation
- the tolerance-fit result (`within`)
- the bridge ID and related public state
- transaction metadata (tx hash, block, signer-related on-chain info)
- assessment counters and the latest verdict state

### What remains private

These values are **not** written as public ledger values by `evaluateBridge()`:

- the exact transfer `amount`
- the risk tolerance `maxRisk`
- the confidential `intel` value
- the detailed total risk score (only the coarse verdict tier is disclosed)

### Important trust-model limitation

> Sensitive inputs stay off-chain and are not written to the public ledger.
> However, the backend acts as a trusted prover and receives the private inputs
> during transaction preparation.

BridgeGuard does **not** claim "100% private", "fully private", or "no data
leaves the user's device". The privacy guarantee is: the inputs never reach the
public ledger and are never logged or returned by the backend.

## How the ZK Evaluation Works

1. The user provides a bridge ID, an amount and a risk tolerance.
2. The backend obtains the confidential intelligence value through the private
   witness (`getRiskIntel` from private state).
3. `evaluateBridge()` computes the risk verdict inside the Compact circuit,
   combining the public bridge score, the confidential intel and the exposure
   implied by the (private) amount relative to the bridge's public TVL.
4. Midnight generates a zero-knowledge proof for the call.
5. The network verifies the proof when the transaction is submitted.
6. Only the coarse verdict and the tolerance-fit result are written to the
   ledger.
7. The frontend reads the resulting verdict from the ledger and displays it.

The verdict tiers are `LOW / MEDIUM / HIGH / CRITICAL`; the exact tier
boundaries are defined in the contract (`computeVerdict`) and are not modified
by the documentation.

## 1AM Wallet Integration

The verified wallet-signed flow:

1. The user connects the **1AM Wallet**.
2. The frontend uses the official **Midnight DApp Connector API**
   (`window.midnight`, `connect('preview')`).
3. The returned **ConnectedAPI** is retained for the whole session — it is
   required for balancing and submitting the transaction.
4. The backend prepares the unproven call transaction and generates the ZK
   proof (`/api/poc/prepare-evaluate`).
5. 1AM balances the transaction (`balanceUnsealedTransaction`, `payFees: true`).
6. 1AM pays the **DUST fee** from the user's wallet.
7. The user approves / signs the transaction in the wallet popup.
8. 1AM submits the transaction to Midnight Preview (`submitTransaction`).
9. The backend observes confirmation on the indexer and reads the resulting
   verdict (`/api/poc/finalize`).

> **1AM is not only used for wallet connection; it authorizes and signs the
> transaction and pays the DUST fee.**

**Lace backward compatibility:** the wallet detection still accepts the legacy
Lace injection ids (`mnLace` / `lace` / `midnight`) when 1AM is not installed.
1AM remains the preferred wallet.

## Why Midnight?

BridgeGuard needs **both blockchain verification and privacy**. A regular smart
contract platform would force the evaluation inputs onto a public ledger.
Midnight's ZK infrastructure lets the verdict be *proved* on-chain while the
inputs that produced it stay private. Midnight is the privacy and verification
layer — it does not perform the actual cross-chain transfer.

## Smart Contract

The contract lives in `contracts/bridgeguard-v2.compact` and is deployed to
Midnight Preview. It implements three circuits:

- **`registerBridge(name, srcChain, dstChain, tvl, audited, incidents)`** —
  stores public bridge metadata and derives the public base risk score.
- **`evaluateBridge(bridgeId, amount, maxRisk)`** — the privacy-preserving risk
  evaluation. `amount` and `maxRisk` are private circuit parameters; `intel` is
  supplied by the off-chain witness `getRiskIntel`. Only the coarse verdict and
  the within-tolerance flag are disclosed.
- **`flagBridge(bridgeId, newStatus)`** — updates the public bridge status
  (`ACTIVE / FLAGGED / COMPROMISED`).

Compiled artifacts (contract JS, ZKIR, prover/verifier keys) are in
`contracts/managed/bridgeguard-v2/` and are generated artifacts — they are not
hand-edited.

## Live Midnight Preview Verification

A successful end-to-end wallet-signed evaluation was executed on Midnight
Preview with the 1AM Wallet. This is **test-transaction evidence** — it is
documented here for verification and is **not** a hard-coded application value.

| Item | Value |
| --- | --- |
| Network | Midnight Preview |
| Contract | BridgeGuard v2 |
| Method | `evaluateBridge()` |
| Transaction hash | `2584217dd1b08abd1b69064ef7812a48421d452b7a095f3fe2be7bfa7a9100a3` |
| Tx ID | `17912` |
| Block | `371834` |
| Transaction status | `SucceedEntirely` |
| Contract address | `4605c30c84eb05670aea8ae4d247aacf06982383d3f72fa568f2f839f22896ec` |
| DUST fee | verified as paid by the user's 1AM wallet |
| Disclosed verdict | `MEDIUM` (verdict tier 1) |
| Within tolerance | `true` |
| Public Outputs | `0` (the circuit returns `[]`; the verdict is a ledger state effect, not a proof output) |

The transaction hash was cross-checked against the Preview indexer
(transaction id 17912 in block 371834).

## Current UI

The verified UI labels:

- **Connected wallet:** 1AM (wallet name shown in the top bar and on the Wallet
  page)
- **Bridge Status: SAFE**
- **On-chain Verdict: MEDIUM**
- Tagline: **"Sensitive inputs stay off-chain."**

"Bridge Status" and "On-chain Verdict" are two different concepts:

- **Bridge Status** (`SAFE / MEDIUM / DANGEROUS`) is derived in the frontend
  from the bridge's **public registry data** (audit status, incident count,
  on-chain status).
- **On-chain Verdict** (`LOW / MEDIUM / HIGH / CRITICAL`) is the **coarse
  verdict produced by the private ZK evaluation** and read back from the ledger.

## Server-Signed Fallback

`POST /api/evaluate` still exists as a **server-signed fallback** path:

- **Wallet-signed mode** (default) uses the user's **1AM wallet** — the user
  approves and pays the DUST fee.
- **Server-signed mode** uses the **backend service wallet** — the backend
  signs and submits with its own key.

The two modes never use the same signing key: the wallet mode uses the user's
1AM wallet; the fallback uses the backend's service wallet.

## Project Structure

```
bridgeguard-ai/
├── contracts/
│   ├── bridgeguard-v2.compact        # Midnight Compact contract source
│   └── managed/bridgeguard-v2/       # compiled artifacts, ZKIR, prover/verifier keys
├── frontend/
│   ├── vite.config.ts                # Vite dev server + /api proxy
│   └── src/
│       ├── pages/
│       │   ├── BridgeAnalysis.tsx    # ZK evaluation UI (wallet-signed + fallback)
│       │   └── WalletConnection.tsx  # wallet connect/disconnect UI
│       ├── hooks/useWallet.tsx       # wallet state management
│       ├── services/
│       │   ├── wallet.ts             # 1AM detection + DApp Connector session
│       │   ├── midnight.ts           # contract service layer + wallet-signed evaluation
│       │   └── api.ts                # backend API client
│       └── utils/riskEngine.ts       # deterministic score helpers
├── src/
│   ├── server.ts                     # backend API + trusted prover
│   ├── witnesses-v2.ts               # getRiskIntel witness
│   └── deploy-v2.ts                  # deployment script
├── tests/bridgeguard.test.ts         # contract simulator test suite
├── package.json
└── docker-compose.yml                # local proof-server (+ devnet)
```

## Setup

Prereqs: Node ≥ 22, Docker (for the local proof-server), npm.

```bash
# 1. Install dependencies including the frontend
npm install
npm --prefix frontend install

# 2. Start the proof server (required for ZK proofs on Preview)
docker compose up -d --wait

# 3. Run the backend (API + SPA) at http://localhost:3000
npx tsx src/server.ts

# 4. (Optional) Vite dev server at http://localhost:5173
npm run frontend:dev
```

The Vite dev server proxies `/api/*` to `http://localhost:3000` (see
`frontend/vite.config.ts`).

### API endpoints

- `GET /api/state` — full ledger snapshot + wallet info
- `GET /api/balance` — tNight + DUST balances
- `GET /api/health` — real connectivity probes (API, contract, indexer, node,
  proof server)
- `POST /api/register` — `registerBridge`
- `POST /api/evaluate` — server-signed fallback `evaluateBridge`
- `POST /api/flag` — `flagBridge`
- `POST /api/poc/prepare-evaluate` — wallet-signed path: backend prepares +
  proves the `evaluateBridge` transaction
- `POST /api/poc/finalize` — wallet-signed path: backend watches the indexer
  and reads back the disclosed verdict

### Deploying

```bash
# Active network is Midnight Preview (see .midnight-state.json)
npx tsx src/deploy-v2.ts --network preview        # Midnight Preview
npx tsx src/deploy-v2.ts --network undeployed     # local devnet (development only)
```

Deployment records are kept in `.midnight-state.json` (gitignored).

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

## Testing

### Automated tests

| Suite | Result |
| --- | --- |
| Contract tests (vitest, in-process simulator) | **16/16 PASS** |
| Frontend TypeScript / build (`tsc -b && vite build`) | **PASS** |
| Wallet simulation checks (Node-based mock of `window.midnight` against the real `wallet.ts`) | **16/16 PASS** |

The contract suite covers `registerBridge`, `evaluateBridge` and `flagBridge`,
plus dedicated privacy-boundary tests asserting that the exact `amount`,
`maxRisk` and `intel` values never appear in any ledger output.

### Live browser test

| Check | Result |
| --- | --- |
| 1AM wallet connection on Midnight Preview | **PASS** |
| Wallet-signed `evaluateBridge` transaction | **PASS** |
| On-chain confirmation (block 371834, `SucceedEntirely`) | **PASS** |
| DUST fee paid by the user's 1AM wallet | **PASS** |
| Coarse verdict read back from the ledger | **PASS** (MEDIUM, within tolerance) |

The automated tests run headless; the live browser test required the real 1AM
extension and a funded wallet on Midnight Preview.

# Hackathon Submission Evidence

## 1. Compact Contract Compilation

The BridgeGuard AI v2 smart contract was successfully compiled using the following command:

```bash
npm run compile:v2
```

The v2 Compact contract exposes the following ZK circuits:
- `registerBridge()`: Registers public bridge metadata and derives its public base risk score.
- `evaluateBridge()`: Evaluates bridge risk using public bridge data and ZK private parameter inputs, returning a coarse on-chain verdict.
- `flagBridge()`: Updates the public status of a bridge (e.g. to flagged or compromised) during security incidents.

![Successful Compact compilation of BridgeGuard AI v2, showing the v2 compilation command and exported circuits.](docs/screenshots/01-compact-compile.png)

---

## 2. Midnight Preview Contract Deployment

The project uses the existing deployed BridgeGuard v2 contract on the Midnight Preview network:

* **Network**: Midnight Preview
* **Deployed Preview Contract Address**: `4605c30c84eb05670aea8ae4d247aacf06982383d3f72fa568f2f839f22896ec`

![Existing BridgeGuard v2 deployment record for the Midnight Preview network, showing the deployed contract address.](docs/screenshots/02-contract-deployment-address.png)

---

## 3. Successful On-chain evaluateBridge() Execution

An end-to-end, privacy-preserving bridge evaluation was successfully executed on the Midnight Preview network. The transaction was signed and submitted using the connected 1AM wallet, paying the required DUST fees directly from the wallet.

* **Network**: Midnight Preview
* **Function**: `evaluateBridge()`
* **Status**: SucceedEntirely
* **Block**: `371834`
* **Contract Address**: `4605c30c84eb05670aea8ae4d247aacf06982383d3f72fa568f2f839f22896ec`
* **Transaction Hash**: `2584217dd1b08abd1b69064ef7812a48421d452b7a095f3fe2be7bfa7a9100a3`
* **DUST fee**: `1 speck`

![Successful evaluateBridge() transaction on Midnight Preview, verified through the 1AM Explorer.](docs/screenshots/03-evaluateBridge-onchain.png)

---

## 4. Live Demo

### Live Demo

[Open BridgeGuard AI v2 Demo]([Live Demo URL to be added])

*(Note: Live demo URL is to be provided.)*

---

## 5. Demo Video

The demo video should demonstrate:
1. Opening the BridgeGuard AI v2 DApp.
2. Connecting the 1AM wallet.
3. Showing the connected wallet/address.
4. Opening Bridge Analysis.
5. Selecting wallet signing / My wallet.
6. Running evaluateBridge().
7. Approving the transaction in 1AM.
8. Showing the successful transaction confirmation.
9. Showing the on-chain verdict.
10. Optionally showing the corresponding transaction in the 1AM Explorer.

Demo video: [To be added]

---

## 6. Evidence Summary Table

| Evidence | Status |
|---|---|
| Compact v2 compilation | PASS |
| Exported circuits: registerBridge, evaluateBridge, flagBridge | PASS |
| Midnight Preview deployment | PASS |
| Deployed contract address documented | PASS |
| 1AM wallet connection | PASS |
| Wallet-signed evaluateBridge() | PASS |
| DUST fee paid by wallet | PASS |
| On-chain transaction confirmation | PASS |
| ZK private-input evaluation | PASS |
| On-chain coarse verdict | PASS |


## Important Limitations

- The **backend is a trusted prover** and sees the private inputs during
  transaction preparation.
- The project protects sensitive inputs from **public ledger disclosure**; it
  does not claim end-to-end browser-only privacy.
- **AI / risk analysis and ZK proof generation are separate responsibilities.**
  The AI Transfer Advisor is a transparent rule-based decision-support engine —
  it does not generate ZK proofs and is not backed by an LLM. The Midnight
  circuit and proving infrastructure generate the proofs.
- The confidential intel feed is currently user-provided through the UI; it is
  not yet connected to an external intelligence provider.

## Future Scope

- Wire a real confidential incident-intelligence provider to feed the
  `getRiskIntel` witness automatically.
- Add a whale-transfer monitoring circuit or an indexer-derived whale feed.
- Richer indexer-driven analytics: verdict trending, liquidity history,
  cross-bridge anomaly detection.
- Deploy to preprod/mainnet using the same `deploy-v2.ts` flow.
- Optional AI-assisted explanation layer on top of the disclosed verdicts.

---

*BridgeGuard AI — a privacy-preserving bridge risk evaluation DApp built on
Midnight.*
