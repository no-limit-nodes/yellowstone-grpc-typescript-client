// Stream confirmed slots plus every successful transaction that touches one program.
// Run: npm run stream                      (PumpSwap AMM by default)
//      npm run stream -- <PROGRAM_ID>      (any program)
import Client, { CommitmentLevel, type SubscribeRequest, type SubscribeUpdate } from '@triton-one/yellowstone-grpc'
import bs58 from 'bs58'

const ENDPOINT = process.env.NLN_GRPC_URL ?? 'https://grpc.mainnet.solana.nolimitnodes.com:443'
const PROGRAM = process.argv[2] ?? 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA' // PumpSwap AMM

// Every filter map must be present, even when empty.
const EMPTY: SubscribeRequest = {
  accounts: {}, slots: {}, transactions: {}, transactionsStatus: {},
  blocks: {}, blocksMeta: {}, entry: {}, blockFooter: {}, accountsDataSlice: [],
}

const request: SubscribeRequest = {
  ...EMPTY,
  slots: { tip: { filterByCommitment: true } },
  transactions: {
    program: {
      vote: false,              // skip vote transactions
      failed: false,            // skip failed transactions
      accountInclude: [PROGRAM],
      accountExclude: [],
      accountRequired: [],
    },
  },
  commitment: CommitmentLevel.CONFIRMED,
}

function handle(update: SubscribeUpdate) {
  if (update.slot) {
    console.log(`slot ${update.slot.slot}`)
  } else if (update.transaction?.transaction) {
    const tx = update.transaction.transaction
    const sig = bs58.encode(tx.signature) // raw bytes -> base58 string
    const logs = tx.meta?.logMessages ?? []
    console.log(`tx   ${update.transaction.slot} ${sig.slice(0, 20)}… ${logs.length} log lines`)
  }
}

async function main() {
  if (!process.env.NLN_API_KEY) {
    console.error('Set NLN_API_KEY first: export NLN_API_KEY="your-api-key"')
    process.exit(1)
  }
  const client = new Client(ENDPOINT, process.env.NLN_API_KEY, {
    grpcMaxDecodingMessageSize: 64 * 1024 * 1024, // full transactions can be large
  })
  await client.connect()
  const stream = await client.subscribe()

  stream.on('data', (update: SubscribeUpdate) => {
    if (update.ping) {
      stream.write({ ...EMPTY, ping: { id: 1 } }) // answer the server's ping
      return
    }
    handle(update)
  })
  stream.on('error', (err: Error) => {
    console.error('stream error:', err.message)
    process.exit(1)
  })

  stream.write(request)
  console.log(`watching ${PROGRAM} at confirmed commitment (Ctrl+C to stop)`)
  process.on('SIGINT', () => { stream.end(); process.exit(0) })
}

main()
