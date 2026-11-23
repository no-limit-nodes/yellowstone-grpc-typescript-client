# Yellowstone gRPC Client in TypeScript (Solana)

A minimal, working **Yellowstone gRPC client in TypeScript** that streams Solana slots and the transactions of any program you choose. It filters on the server, decodes signatures to base58, answers keepalive pings and reconnects with backoff. It is about 50 lines, and it is the starting point for most Solana streaming projects: trading bots, alert bots, indexers and dashboards.

This repository is the companion code for the [NoLimitNodes Academy](https://nolimitnodes.com/academy) walkthrough **[Your first Yellowstone gRPC client in TypeScript](https://nolimitnodes.com/academy/first-yellowstone-grpc-client-typescript)**. The lesson explains every line step by step. This repo gives you the finished project, ready to clone and run.

```text
$ npm run stream
watching pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA at confirmed commitment (Ctrl+C to stop)
slot 381204117
tx   381204117 4pXq7oQ2uJbV9Vh3kNw1… 38 log lines
tx   381204117 2Cw8mZfLr6tHd1eYqA5s… 41 log lines
slot 381204118
```

*Example output is trimmed.*

## What is Yellowstone gRPC?

Yellowstone gRPC (also called Geyser gRPC) streams data straight out of a Solana validator's Geyser plugin. You don't poll an RPC node and ask "anything new?" over and over. You open one long-lived connection, send filters that describe what you want, and the server pushes matching slots, transactions, accounts and blocks as soon as they exist. It is the lowest-latency way to read confirmed Solana data without running your own validator.

Not sure gRPC is the right tool? The Academy article [5 ways to get real-time Solana data, compared](https://nolimitnodes.com/academy/ways-to-get-real-time-solana-data-compared) compares gRPC with RPC polling, WebSockets, webhooks and shreds.

## Quick start

You need Node.js 20 or newer and a [NoLimitNodes](https://nolimitnodes.com) API key on a plan that includes Yellowstone gRPC streams ([pricing](https://nolimitnodes.com/pricing)).

```bash
git clone https://github.com/no-limit-nodes/yellowstone-grpc-typescript-client.git
cd yellowstone-grpc-typescript-client
npm install

export NLN_API_KEY="your-api-key"   # https://app.nolimitnodes.com/register

npm run slots                        # 1. confirm the connection: one slot every ~400 ms
npm run stream                       # 2. slots + PumpSwap AMM transactions
npm run stream -- <PROGRAM_ID>       # 3. any program you care about
npm run reconnect -- <PROGRAM_ID>    # 4. same stream with automatic reconnects
```

`NLN_GRPC_URL` overrides the endpoint. The default is `https://grpc.mainnet.solana.nolimitnodes.com:443`.

## The scripts

| File | What it shows | Lesson section |
|---|---|---|
| [`src/slots.ts`](src/slots.ts) | The smallest possible stream: confirmed slots only | [Your first subscription: slots](https://nolimitnodes.com/academy/first-yellowstone-grpc-client-typescript#first-subscription) |
| [`src/stream.ts`](src/stream.ts) | Slots plus every successful transaction that touches one program | [Filter transactions by program](https://nolimitnodes.com/academy/first-yellowstone-grpc-client-typescript#filter-transactions) |
| [`src/reconnect.ts`](src/reconnect.ts) | A reconnect loop with exponential backoff for long-running services | [When things go wrong](https://nolimitnodes.com/academy/first-yellowstone-grpc-client-typescript#errors) |

## How it works

**1. Connect.** The client takes the endpoint, your token (sent as `x-token` metadata) and channel options. Raise the maximum message size, because full transactions can be bigger than the gRPC default.

```ts
const client = new Client(ENDPOINT, process.env.NLN_API_KEY, {
  grpcMaxDecodingMessageSize: 64 * 1024 * 1024,
})
await client.connect()
const stream = await client.subscribe()
```

**2. Subscribe with filters.** A `SubscribeRequest` is a set of named filter maps, one for each kind of data. Every map must be present, even when it is empty. The filter name (`program` below) comes back in each matching update's `filters` field.

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

## FAQ

**Which npm package do I use for Yellowstone gRPC in TypeScript?**
`@triton-one/yellowstone-grpc`, the official Node.js client. Pin the version and commit your lockfile.

**Can I use Yellowstone gRPC from a browser?**
No. Browsers can't open the long-lived bidirectional gRPC stream. Run the client on a server and push results to the browser over a WebSocket.

**How do I watch several programs at once?**
Put several program IDs in `accountInclude`, or add more named filters to the same request. The [new-pool alert bot](https://github.com/no-limit-nodes/solana-new-pool-alert-bot) watches five DEX programs on one stream this way.

## Learn more on NoLimitNodes Academy

- [Your first Yellowstone gRPC client in TypeScript](https://nolimitnodes.com/academy/first-yellowstone-grpc-client-typescript): the full walkthrough for this repo, with a 3-question check at the end
- [Build a Solana new-pool alert bot](https://nolimitnodes.com/academy/build-new-pool-alert-bot-solana): the next step, built on this skeleton ([code](https://github.com/no-limit-nodes/solana-new-pool-alert-bot))
- [What is a Solana RPC node?](https://nolimitnodes.com/academy/what-is-a-solana-rpc-node)
- [Slots, blocks and commitment levels, explained](https://nolimitnodes.com/academy/solana-slots-blocks-commitment-explained)
- [Solana RPC code snippets](https://nolimitnodes.com/academy/snippets) and [practice quizzes](https://nolimitnodes.com/academy/practice)
- Prefer Python? See the [Yellowstone gRPC Python guide](https://nolimitnodes.com/blog/yellowstone-grpc-python).

Endpoint details are in the [Yellowstone gRPC quickstart](https://nolimitnodes.com/docs/quickstarts/yellowstone-grpc).

## License

MIT
