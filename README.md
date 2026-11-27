<h1 align="center">Yellowstone gRPC TypeScript Client: Stream Solana Slots and Program Transactions</h1>

<p align="center">
  <b>A minimal, working Yellowstone gRPC client in TypeScript that streams Solana slots and the transactions of any program you choose.</b><br>
  <sub>Three short scripts for the <a href="https://nolimitnodes.com/">NoLimitNodes</a> Yellowstone gRPC endpoint: slots only, slots plus one program, and a reconnect loop with backoff. Companion code for a NoLimitNodes Academy lesson.</sub>
</p>

<p align="center">
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square"></a>
  <a href="#the-scripts"><img alt="TypeScript" src="https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square"></a>
  <a href="#the-scripts"><img alt="3 scripts" src="https://img.shields.io/badge/scripts-3-green?style=flat-square"></a>
  <a href="https://nolimitnodes.com/"><img alt="Powered by NoLimitNodes" src="https://img.shields.io/badge/powered%20by-NoLimitNodes-FBDE00?style=flat-square&labelColor=000000"></a>
  <a href="#how-it-works"><img alt="Yellowstone gRPC" src="https://img.shields.io/badge/transport-Yellowstone%20gRPC-brightgreen?style=flat-square"></a>
  <a href="https://solana.com"><img alt="Solana Mainnet" src="https://img.shields.io/badge/solana-mainnet-9945FF?style=flat-square"></a>
</p>

<p align="center">
  <a href="#quickstart-stream-solana-over-yellowstone-grpc">Quickstart</a> ·
  <a href="#the-scripts">Scripts</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#troubleshooting">Troubleshooting</a> ·
  <a href="#use-cases">Use cases</a> ·
  <a href="#faq">FAQ</a> ·
  <a href="#learn-more-on-nolimitnodes-academy">Academy</a>
</p>

---

## What this is

A minimal **Yellowstone gRPC client in TypeScript** that streams Solana slots and the transactions of any program you choose. It filters on the server, decodes signatures to base58, answers keepalive pings and reconnects with backoff. It is about 50 lines, and it is the starting point for most Solana streaming projects: trading bots, alert bots, indexers and dashboards.

This repo is the companion code for the [NoLimitNodes Academy](https://nolimitnodes.com/academy) walkthrough **[Your first Yellowstone gRPC client in TypeScript](https://nolimitnodes.com/academy/first-yellowstone-grpc-client-typescript)**. The lesson explains every line step by step. This repo gives you the finished project, ready to clone and run.

**If you've been looking for any of these, you're in the right place:**

- A **Yellowstone gRPC TypeScript example** that runs as-is
- A **Solana gRPC client in Node.js** using `@triton-one/yellowstone-grpc`
- How to **subscribe to Solana program transactions** with server-side filters
- A **Geyser gRPC slot stream** to check your connection
- A working **`SubscribeRequest` example** with every required filter map
- How to **keep a Yellowstone gRPC stream alive** with ping replies
- A **Yellowstone gRPC reconnect** loop with exponential backoff
- A fix for **`This expression is not constructable`** with the Yellowstone client

## What is Yellowstone gRPC?

Yellowstone gRPC (also called Geyser gRPC) streams data straight out of a Solana validator's Geyser plugin. You don't poll an RPC node and ask "anything new?" over and over. You open one long-lived connection, send filters that describe what you want, and the server pushes matching slots, transactions, accounts and blocks as soon as they exist. It is the lowest-latency way to read confirmed Solana data without running your own validator.

## Who this is for

- **TypeScript and Node.js developers** writing their first Solana stream
- **Bot developers** who need a reliable transaction feed for one or more programs
- **Indexer and dashboard builders** moving from RPC polling to push-based data
- **Developers migrating from WebSocket subscriptions** who want server-side filters and full transactions

## Quickstart: stream Solana over Yellowstone gRPC

You need Node.js 20 or newer and a NoLimitNodes API key on a plan that includes Yellowstone gRPC streams ([pricing](https://nolimitnodes.com/pricing)).

### Step 1. Get an API key

Go to **[app.nolimitnodes.com/register](https://app.nolimitnodes.com/register)** and create an account. You get a 5-day free Pro trial, no credit card required. Copy your API key from the dashboard.

### Step 2. Clone and run

```bash
git clone https://github.com/no-limit-nodes/yellowstone-grpc-typescript-client.git
cd yellowstone-grpc-typescript-client
npm install

export NLN_API_KEY="your-api-key"

npm run slots                        # 1. confirm the connection: one slot every ~400 ms
npm run stream                       # 2. slots + PumpSwap AMM transactions
npm run stream -- <PROGRAM_ID>       # 3. any program you care about
npm run reconnect -- <PROGRAM_ID>    # 4. same stream with automatic reconnects
```

Example output of `npm run stream`:

```text
$ npm run stream
watching pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA at confirmed commitment (Ctrl+C to stop)
slot 381204117
tx   381204117 4pXq7oQ2uJbV9Vh3kNw1… 38 log lines
tx   381204117 2Cw8mZfLr6tHd1eYqA5s… 41 log lines
slot 381204118
```

*Example output is trimmed.*

### Configuration

| Variable or argument | Default | Purpose |
|---|---|---|
| `NLN_API_KEY` | required | Your NoLimitNodes API key, sent as `x-token` metadata |
| `NLN_GRPC_URL` | `https://grpc.mainnet.solana.nolimitnodes.com:443` | Yellowstone gRPC endpoint |
| `<PROGRAM_ID>` (first argument to `stream` and `reconnect`) | `pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA` (PumpSwap AMM) | The program whose transactions you want |

`npm run typecheck` runs `tsc` with no emit.

## The scripts

| File | What it shows | What it prints | Lesson section |
|---|---|---|---|
| [`src/slots.ts`](src/slots.ts) | The smallest possible stream: confirmed slots only | `slot <n> status <status>` | [Your first subscription: slots](https://nolimitnodes.com/academy/first-yellowstone-grpc-client-typescript#first-subscription) |
| [`src/stream.ts`](src/stream.ts) | Slots plus every successful transaction that touches one program | `slot <n>` and `tx <slot> <signature prefix>… <n> log lines` | [Filter transactions by program](https://nolimitnodes.com/academy/first-yellowstone-grpc-client-typescript#filter-transactions) |
| [`src/reconnect.ts`](src/reconnect.ts) | The program transaction stream in a reconnect loop with exponential backoff, for long-running services | `tx <slot> <signature>`, plus a line on each disconnect | [When things go wrong](https://nolimitnodes.com/academy/first-yellowstone-grpc-client-typescript#errors) |

### Reconnect behavior in `src/reconnect.ts`

- The first retry waits 1 second. Each failure doubles the wait, up to 30 seconds.
- A stream that stayed up for more than a minute counts as healthy, so the wait resets to 1 second.
- On every disconnect it prints `disconnected after slot <lastSlot>; retrying in <n>s`.
- It tracks the last slot it saw, so you know where to backfill. Use RPC (`getSignaturesForAddress`) to fill the gap.

## How it works

**1. Connect.** The client takes the endpoint, your token (sent as `x-token` metadata) and channel options. Raise the maximum message size, because full transactions can be bigger than the gRPC default.

```ts
const client = new Client(ENDPOINT, process.env.NLN_API_KEY, {
  grpcMaxDecodingMessageSize: 64 * 1024 * 1024,
})
await client.connect()
const stream = await client.subscribe()
```

**2. Subscribe with filters.** A `SubscribeRequest` is a set of named filter maps, one for each kind of data. Every map must be present, even when it is empty (`accounts`, `slots`, `transactions`, `transactionsStatus`, `blocks`, `blocksMeta`, `entry`, `blockFooter`, `accountsDataSlice`). The filter name (`program` below) comes back in each matching update's `filters` field.

```ts
stream.write({
  ...EMPTY,
  slots: { tip: { filterByCommitment: true } },
  transactions: {
    program: { vote: false, failed: false, accountInclude: [PROGRAM], accountExclude: [], accountRequired: [] },
  },
  commitment: CommitmentLevel.CONFIRMED,
})
```

| Field | What it does |
|---|---|
| `vote` | `false` drops vote transactions, which make up most Solana transactions |
| `failed` | `false` drops transactions that failed on chain |
| `accountInclude` | Match if the transaction touches **any** of these accounts (a program ID counts as an account) |
| `accountExclude` | Drop the transaction if it touches any of these |
| `accountRequired` | Match only if the transaction touches **all** of these |

To change filters, write a new request on the same stream. It replaces the old filters, so you don't need to reconnect.

**3. Read updates.** Each update has exactly one payload field set (`slot`, `transaction`, `account`, `ping`…). Signatures and public keys arrive as raw bytes, so encode them with `bs58`. Slot numbers arrive as strings, because a uint64 can be larger than a JavaScript number can hold exactly.

**4. Stay alive.** The server sends a `ping` about every 15 seconds. Answer it with `{ ...EMPTY, ping: { id: 1 } }`, or proxies and load balancers will close the connection as idle.

Which commitment level should you use? The lesson [Slots, blocks and commitment levels, explained](https://nolimitnodes.com/academy/solana-slots-blocks-commitment-explained) covers the trade-off between `processed`, `confirmed` and `finalized`.

## Troubleshooting

- **`UNAUTHENTICATED`**: the key is missing or wrong. Check that `NLN_API_KEY` is exported in the same shell you run the script from.
- **`This expression is not constructable`**: your `tsconfig.json` uses `NodeNext` resolution. Use `"moduleResolution": "Bundler"`, as this repo does.
- **Too many streams**: every plan allows a fixed number of concurrent gRPC streams (2 on Pro, 10 on Ultra on NoLimitNodes). One stream can carry many named filters, so add filters before you add streams.
- **The stream ends**: `subscribe()` never reconnects by itself. Use `src/reconnect.ts` as a template, and use RPC to backfill any gap. See the [keepalive and replay docs](https://nolimitnodes.com/docs/api-reference/grpc/keepalive-replay).
- **Different client version**: request fields change between releases. This repo pins `@triton-one/yellowstone-grpc@10.0.0`. If you upgrade, compare the `SubscribeRequest` type with the code.

## Use cases

### Bots and alerts

- **Program activity feeds.** Point `stream.ts` at a DEX or launchpad program and react to each transaction.
- **New-pool and launch alerts.** The [new-pool alert bot](https://github.com/no-limit-nodes/solana-new-pool-alert-bot) is this skeleton plus a log matcher for five DEX programs.

### Data and infrastructure

- **Indexers.** Use `reconnect.ts` as the live half of an indexer, and backfill gaps over RPC.
- **Dashboards.** Run the client on a server and push results to the browser over a WebSocket.
- **Connection health checks.** `npm run slots` is a quick way to confirm an endpoint and key work.

## Yellowstone gRPC vs WebSocket subscriptions: when to pick which

Pick Yellowstone gRPC when you want server-side filters over many accounts in one request, full transactions in each update, and filter changes without reconnecting. Stick with WebSocket subscriptions when the client is a browser, which can't open the long-lived bidirectional gRPC stream, or when a single simple subscription is all you need. The Academy article [5 ways to get real-time Solana data, compared](https://nolimitnodes.com/academy/ways-to-get-real-time-solana-data-compared) puts gRPC next to RPC polling, WebSockets, webhooks and shreds.

## Repo layout

```text
yellowstone-grpc-typescript-client/
├── src/
│   ├── slots.ts           # confirmed slots only (npm run slots)
│   ├── stream.ts          # slots + one program's transactions (npm run stream)
│   └── reconnect.ts       # program stream with backoff reconnects (npm run reconnect)
├── package.json
├── package-lock.json
├── tsconfig.json
├── LICENSE
└── README.md
```

## FAQ

<details>
<summary><b>Which npm package do I use for Yellowstone gRPC in TypeScript?</b></summary>

Use `@triton-one/yellowstone-grpc`, the official Node.js client. This repo pins version `10.0.0`, because request fields change between releases. Pin the version in your own project and commit your lockfile, so a new release can't change the shape of `SubscribeRequest` under you.
</details>

<details>
<summary><b>Can I use Yellowstone gRPC from a browser?</b></summary>

No. Browsers can't open the long-lived bidirectional gRPC stream that Yellowstone uses. Run the client on a server, filter and shape the data there, then push results to the browser over a WebSocket. That also keeps your API key off the client, where anyone could read it.
</details>

<details>
<summary><b>How do I watch several programs at once?</b></summary>

Put several program IDs in `accountInclude`, or add more named filters to the same request. One stream can carry many filters, and each update tells you which filter matched. The [new-pool alert bot](https://github.com/no-limit-nodes/solana-new-pool-alert-bot) watches five DEX programs on one stream this way.
</details>

<details>
<summary><b>Why does my Yellowstone gRPC stream disconnect after a while?</b></summary>

Usually because the client did not answer the server's ping, which arrives about every 15 seconds. Proxies and load balancers then close the connection as idle. Reply with `{ ...EMPTY, ping: { id: 1 } }`. Streams also end on network errors, and `subscribe()` never reconnects by itself, so use a loop like `src/reconnect.ts`.
</details>

<details>
<summary><b>Why are Solana slot numbers strings in the Yellowstone client?</b></summary>

Slots are uint64 values, and a uint64 can be larger than a JavaScript number can hold exactly. The client returns them as strings to avoid silent rounding. Convert with `BigInt(slot)` when you need math. Signatures and public keys arrive as raw bytes, so encode them with `bs58` before printing.
</details>

<details>
<summary><b>How do I change filters without reconnecting?</b></summary>

Write a new `SubscribeRequest` on the same stream. The new request replaces the old filters, so you don't need to open a new connection. Remember that every filter map must still be present, even when empty. Spreading an `EMPTY` request object, as these scripts do, is the easiest way to get that right.
</details>

## Learn more on NoLimitNodes Academy

- [Your first Yellowstone gRPC client in TypeScript](https://nolimitnodes.com/academy/first-yellowstone-grpc-client-typescript): the full walkthrough for this repo, with a 3-question check at the end
- [Build a Solana new-pool alert bot](https://nolimitnodes.com/academy/build-new-pool-alert-bot-solana): the next step, built on this skeleton ([code](https://github.com/no-limit-nodes/solana-new-pool-alert-bot))
- [What is a Solana RPC node?](https://nolimitnodes.com/academy/what-is-a-solana-rpc-node): the request/response side you use to backfill gaps
- [Slots, blocks and commitment levels, explained](https://nolimitnodes.com/academy/solana-slots-blocks-commitment-explained): pick between `processed`, `confirmed` and `finalized`
- [5 ways to get real-time Solana data, compared](https://nolimitnodes.com/academy/ways-to-get-real-time-solana-data-compared): when gRPC is the right tool
- [Solana RPC code snippets](https://nolimitnodes.com/academy/snippets) and [practice quizzes](https://nolimitnodes.com/academy/practice)
- Prefer Python? See the [Yellowstone gRPC Python guide](https://nolimitnodes.com/blog/yellowstone-grpc-python).

Endpoint details are in the [Yellowstone gRPC quickstart](https://nolimitnodes.com/docs/quickstarts/yellowstone-grpc).

## Contributing

Issues and pull requests are welcome. Keep the scripts short and runnable, and run `npm run typecheck` before you open a PR.

## License

[MIT](./LICENSE).

## Related resources

- [NoLimitNodes](https://nolimitnodes.com/)
- [NoLimitNodes gRPC nodes](https://nolimitnodes.com/products/grpc-nodes)
- [Yellowstone gRPC quickstart](https://nolimitnodes.com/docs/quickstarts/yellowstone-grpc)
- [gRPC client setup](https://nolimitnodes.com/docs/api-reference/grpc/client-setup) and [errors and limits](https://nolimitnodes.com/docs/api-reference/grpc/errors-limits)
- [Yellowstone gRPC vs WebSockets for real-time Solana data](https://nolimitnodes.com/blog/yellowstone-grpc-vs-websockets-real-time-solana-data)
- [Glossary: Yellowstone gRPC](https://nolimitnodes.com/glossary/yellowstone-grpc) and [Geyser plugin](https://nolimitnodes.com/glossary/geyser-plugin)
- [Yellowstone gRPC source (rpcpool/yellowstone-grpc)](https://github.com/rpcpool/yellowstone-grpc)
- [gRPC core concepts](https://grpc.io/docs/what-is-grpc/core-concepts/)

---

<p align="center">
  <b>Ready to stream Solana over Yellowstone gRPC?</b><br>
  <a href="https://app.nolimitnodes.com/register">Register, get a 5-day free Pro trial, grab your API key →</a>
</p>
