# Cardano Transaction Decoder

A CLI tool for decoding and comparing Cardano transactions. Turns raw CBOR hex into readable JSON so you can see exactly what's inside.

## Who Is This For?

- **dApp developers** debugging failed transactions
- **Smart contract builders** comparing expected vs actual witness sets
- **Teams migrating** between transaction builder libraries
- **Anyone** who's seen "script integrity hash mismatch" and wanted to know why

## What Problems Does It Solve?

- **"Why won't my transaction validate?"** — See the exact script data hash, redeemers, and datums
- **"Two tx builders give different results"** — Compare them side-by-side and find the exact field that differs
- **"What's actually in this transaction?"** — Decode any tx hex to readable JSON

## Installation

```bash
npm install -g cardano-tx-decoder
```

Or use directly with npx:

```bash
npx cardano-tx-decoder decode 84a500...
```

## CLI Usage

### Decode a Transaction

```bash
# Full decode with pretty output
ctd decode 84a500d9010282825820...

# Decode from a file (for large transactions that exceed CLI limits)
ctd decode ./tx1.hex
ctd decode C:/path/to/transaction.txt

# Output as JSON
ctd decode ./tx.hex --json
```

### Compare Two Transactions

Find exactly what differs between two transaction builds:

```bash
# Using file paths (recommended for large txs)
ctd compare ./tx1.hex ./tx2.hex

# Using direct hex
ctd compare <tx1-hex> <tx2-hex>
```

### File Input

Any argument can be a file path instead of raw hex. This bypasses shell argument length limits (typically 128KB-2MB) for large transactions.

Files should contain raw hex (no `0x` prefix), whitespace is automatically trimmed.

### Example Output

```
================================================================================
TRANSACTION COMPARISON
================================================================================

--- TRANSACTION 1 ---
Script Data Hash: f952539efbf6ad2ff8bf380ef60a8f84c6473d1fcb7bb097f1f3dbb254d2b825
Inputs: 2
Outputs: 3
...

--- DIFFERENCES ---

❌ Script Data Hash DIFFERS
   TX1: f952539efbf6ad2ff8bf380ef60a8f84c6473d1fcb7bb097f1f3dbb254d2b825
   TX2: 5e4edebba50f3bf7be0d7ff7e07619b63d4edea30be0de8f641e5561206ef921
✅ Input ordering matches
❌ Witness set differences:
   Plutus data at index 0 differs
     Value differs at .fields[1]:
       TX1: 0x5139e81456c1b4e2f0af22c1e94ff22ea648588b03a7c7914b6eb256
       TX2: 0xc8d25b5c76b19bda9c88a0120a2dbcdc2ddd3f82921aa98ca3585428
```

### Decode Plutus Data

Decode a datum or redeemer to readable JSON:

```bash
ctd decode-datum d8799f9fd8799fd8799f...
```

### Decode Witness Set Only

```bash
ctd decode-witness a10281...
```

## Library Usage

```typescript
import { 
  decodeTransaction, 
  decodeWitnessSet,
  compareTransactions,
  decodePlutusData 
} from 'cardano-tx-decoder';

// Decode a transaction
const tx = decodeTransaction(txHex);
console.log(tx.scriptDataHash);
console.log(tx.witnessSet.plutusData);

// Compare two transactions
const comparison = compareTransactions(tx1, tx2);
if (!comparison.scriptDataHashMatch) {
  console.log('Script data hash differs!');
  console.log(comparison.witnessSetDifferences);
}

// Decode a datum to JSON
const datum = decodePlutusData(datumHex);
console.log(JSON.stringify(datum, null, 2));
```

## Common Issues This Helps Debug

### 1. Script Data Hash Mismatch
The script data hash is computed from:
- All redeemers
- All datums in the witness set
- Cost models

If your witness sets differ, the hash will differ.

### 2. Wrong Owner in Datum
A common mistake is using the payment credential instead of the stake credential as the "owner" field in marketplace datums.

```
❌ TX1 owner: 0xc8d25b5c... (payment credential - WRONG)
✅ TX2 owner: 0x5139e814... (stake credential - CORRECT)
```

### 3. Input Ordering
Redeemer indices depend on the lexicographic ordering of inputs. If inputs are added in a different order, redeemer indices will be wrong.

### 4. Datum Witness vs Inline Datum
Some implementations add datums to the witness set, others use inline datums. The script data hash differs based on which approach is used.

## Development

```bash
# Clone the repo
git clone https://github.com/ThomasEnoch/cardano-tx-decoder.git
cd cardano-tx-decoder

# Install dependencies
npm install

# Run in development mode
npm run dev decode 84a500...

# Build
npm run build

# Test locally
npm link
ctd decode 84a500...
```

## License

MIT
