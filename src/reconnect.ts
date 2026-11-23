// The same stream as stream.ts, wrapped in a reconnect loop with exponential backoff.
// subscribe() never reconnects by itself, so long-running services need something like this.
// Run: npm run reconnect -- [PROGRAM_ID]
import Client, { CommitmentLevel, type SubscribeRequest, type SubscribeUpdate } from '@triton-one/yellowstone-grpc'
import bs58 from 'bs58'

const ENDPOINT = process.env.NLN_GRPC_URL ?? 'https://grpc.mainnet.solana.nolimitnodes.com:443'
const PROGRAM = process.argv[2] ?? 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA'

const EMPTY: SubscribeRequest = {
  accounts: {}, slots: {}, transactions: {}, transactionsStatus: {},
  blocks: {}, blocksMeta: {}, entry: {}, blockFooter: {}, accountsDataSlice: [],
}

const request: SubscribeRequest = {
  ...EMPTY,
  transactions: {
    program: { vote: false, failed: false, accountInclude: [PROGRAM], accountExclude: [], accountRequired: [] },
  },
  commitment: CommitmentLevel.CONFIRMED,
}

let lastSlot: string | undefined

// Resolves when the stream ends or errors, so the caller can reconnect.
async function runOnce(): Promise<void> {
  const client = new Client(ENDPOINT, process.env.NLN_API_KEY, {
    grpcMaxDecodingMessageSize: 64 * 1024 * 1024,
  })
  await client.connect()
  const stream = await client.subscribe()

  await new Promise<void>((resolve) => {
    stream.on('data', (update: SubscribeUpdate) => {
      if (update.ping) {
        stream.write({ ...EMPTY, ping: { id: 1 } })
        return
      }
      const tx = update.transaction?.transaction
      if (tx) {
        lastSlot = update.transaction!.slot
        console.log(`tx ${lastSlot} ${bs58.encode(tx.signature)}`)
      }
    })
    stream.on('error', (err: Error) => { console.error('stream error:', err.message); resolve() })
    stream.on('end', () => resolve())
    stream.on('close', () => resolve())
    stream.write(request)
    console.log(`connected, watching ${PROGRAM}`)
  })
}

async function main() {
  let delay = 1_000
  for (;;) {
    const started = Date.now()
    try {
      await runOnce()
    } catch (err) {
      console.error('connect failed:', (err as Error).message)
    }
    // A stream that stayed up for a minute counts as healthy: reset the backoff.
    if (Date.now() - started > 60_000) delay = 1_000
    console.log(`disconnected after slot ${lastSlot ?? '-'}; retrying in ${delay / 1000}s`)
    // Use RPC (getSignaturesForAddress) to backfill anything missed after lastSlot.
    await new Promise((r) => setTimeout(r, delay))
    delay = Math.min(delay * 2, 30_000)
  }
}

process.on('SIGINT', () => process.exit(0))
main()
