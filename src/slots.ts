// Smallest possible Yellowstone gRPC stream: print every confirmed slot.
// Run: npm run slots
import Client, { CommitmentLevel, type SubscribeRequest, type SubscribeUpdate } from '@triton-one/yellowstone-grpc'

const ENDPOINT = process.env.NLN_GRPC_URL ?? 'https://grpc.mainnet.solana.nolimitnodes.com:443'

// Every filter map must be present, even when you leave it empty.
const EMPTY: SubscribeRequest = {
  accounts: {}, slots: {}, transactions: {}, transactionsStatus: {},
  blocks: {}, blocksMeta: {}, entry: {}, blockFooter: {}, accountsDataSlice: [],
}

const client = new Client(ENDPOINT, process.env.NLN_API_KEY, {
  grpcMaxDecodingMessageSize: 64 * 1024 * 1024,
})
await client.connect()
const stream = await client.subscribe()

stream.on('data', (update: SubscribeUpdate) => {
  if (update.ping) {
    stream.write({ ...EMPTY, ping: { id: 1 } })
    return
  }
  if (update.slot) console.log('slot', update.slot.slot, 'status', update.slot.status)
})
stream.on('error', (err: Error) => {
  console.error('stream error:', err.message)
  process.exit(1)
})

stream.write({
  ...EMPTY,
  slots: { tip: { filterByCommitment: true } },
  commitment: CommitmentLevel.CONFIRMED,
})

process.on('SIGINT', () => { stream.end(); process.exit(0) })
