#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { decodeTransaction, decodeWitnessSet, decodePlutusData } from "./decoder.js";
import { compareTransactions } from "./compare.js";

/**
 * Read hex from a file or return the string as-is if not a file path.
 * Supports:
 *   - Direct hex string
 *   - File path (reads file contents, trims whitespace)
 *   - Stdin via "-" (TODO: future enhancement)
 */
function readHexInput(input: string): string {
  // Check if it's a file path
  if (existsSync(input)) {
    const content = readFileSync(input, "utf-8").trim();
    return content;
  }
  // Otherwise treat as raw hex
  return input.trim();
}

const HELP = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                      CARDANO TRANSACTION DECODER                               ║
║                                                                                 ║
║  Decode and compare Cardano transactions to debug witness set differences      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

USAGE:
  cardano-tx-decoder <command> [options]
  ctd <command> [options]

COMMANDS:
  decode <tx-hex>                    Decode a single transaction
  decode-witness <witness-hex>       Decode a witness set
  decode-datum <datum-hex>           Decode plutus data (datum/redeemer)
  compare <tx1-hex> <tx2-hex>        Compare two transactions
  compare-witness <ws1-hex> <ws2-hex> Compare two witness sets

OPTIONS:
  --json                             Output as JSON (default: pretty print)
  --help, -h                         Show this help message

EXAMPLES:
  # Decode a transaction (direct hex)
  ctd decode 84a500d9010282825820...

  # Decode from a file (for large transactions)
  ctd decode ./tx1.hex
  ctd decode C:/path/to/transaction.txt

  # Compare two transactions (files or hex)
  ctd compare ./tx1.hex ./tx2.hex
  ctd compare 84a500... 84a500...

  # Decode a plutus datum
  ctd decode-datum d8799f9fd8799fd8799f...

  # Output as JSON for piping
  ctd decode ./tx.hex --json | jq '.witnessSet.plutusData'

FILE INPUT:
  Any argument that is a valid file path will be read as a file.
  Files should contain raw hex (no 0x prefix), whitespace is trimmed.
  This bypasses shell argument length limits for large transactions.
`;

function printHelp() {
  console.log(HELP);
}

function printJson(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

function printTransaction(decoded: ReturnType<typeof decodeTransaction>, label?: string) {
  if (label) {
    console.log(`\n--- ${label} ---\n`);
  }
  console.log("Script Data Hash:", decoded.scriptDataHash ?? "none");
  console.log("Inputs:", decoded.inputCount);
  console.log("Outputs:", decoded.outputCount);
  console.log("Fee:", decoded.fee, "lovelace");
  console.log("TTL:", decoded.ttl ?? "none");
  console.log("Validity Start:", decoded.validityStart ?? "none");
  console.log("Required Signers:", decoded.requiredSigners.length > 0 ? decoded.requiredSigners : "none");

  console.log("\nInputs (ordered):");
  decoded.inputs.forEach((input, i) => {
    console.log(`  [${i}] ${input.txHash}#${input.index}`);
  });

  console.log("\nWitness Set:");
  printWitnessSet(decoded.witnessSet);
}

function printWitnessSet(ws: ReturnType<typeof decodeWitnessSet>) {
  if (ws.plutusData?.length) {
    console.log(`  Plutus Data (${ws.plutusData.length} datums):`);
    ws.plutusData.forEach((datum, i) => {
      console.log(`    [${i}] ${datum.hex.slice(0, 60)}...`);
    });
  }

  if (ws.redeemers?.length) {
    console.log(`  Redeemers (${ws.redeemers.length}):`);
    ws.redeemers.forEach((r, i) => {
      console.log(`    [${i}] ${r.tag} index=${r.index} exUnits=(${r.exUnits.mem}, ${r.exUnits.steps})`);
    });
  }

  if (ws.plutusScriptHashes?.length) {
    console.log(`  Plutus Scripts (${ws.plutusScriptHashes.length}):`);
    ws.plutusScriptHashes.forEach((hash, i) => {
      console.log(`    [${i}] ${hash}`);
    });
  }

  if (ws.vkeyCount) {
    console.log(`  VKey Witnesses: ${ws.vkeyCount}`);
  }
  if (ws.nativeScriptCount) {
    console.log(`  Native Scripts: ${ws.nativeScriptCount}`);
  }
  if (ws.bootstrapCount) {
    console.log(`  Bootstrap Witnesses: ${ws.bootstrapCount}`);
  }
}

function printComparison(
  tx1: ReturnType<typeof decodeTransaction>,
  tx2: ReturnType<typeof decodeTransaction>,
) {
  console.log("\n" + "=".repeat(80));
  console.log("TRANSACTION COMPARISON");
  console.log("=".repeat(80));

  printTransaction(tx1, "TRANSACTION 1");
  printTransaction(tx2, "TRANSACTION 2");

  console.log("\n--- DIFFERENCES ---\n");

  const result = compareTransactions(tx1, tx2);

  if (result.scriptDataHashMatch) {
    console.log("✅ Script Data Hash matches");
  } else {
    console.log("❌ Script Data Hash DIFFERS");
    console.log(`   TX1: ${tx1.scriptDataHash}`);
    console.log(`   TX2: ${tx2.scriptDataHash}`);
  }

  if (result.inputOrderMatch) {
    console.log("✅ Input ordering matches");
  } else {
    console.log("❌ Input ordering differs:");
    result.inputDifferences.forEach((d) => console.log(`   ${d}`));
  }

  if (result.witnessSetDifferences.length === 0) {
    console.log("✅ Witness sets match");
  } else {
    console.log("❌ Witness set differences:");
    result.witnessSetDifferences.forEach((d) => console.log(`   ${d}`));
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const jsonOutput = args.includes("--json");
  const filteredArgs = args.filter((a) => !a.startsWith("--"));
  const command = filteredArgs[0];

  try {
    switch (command) {
      case "decode": {
        const txInput = filteredArgs[1];
        if (!txInput) {
          console.error("Error: Missing transaction hex or file path");
          process.exit(1);
        }
        const txHex = readHexInput(txInput);
        const decoded = decodeTransaction(txHex);
        if (jsonOutput) {
          printJson(decoded);
        } else {
          printTransaction(decoded);
        }
        break;
      }

      case "decode-witness": {
        const wsInput = filteredArgs[1];
        if (!wsInput) {
          console.error("Error: Missing witness set hex or file path");
          process.exit(1);
        }
        const wsHex = readHexInput(wsInput);
        const decoded = decodeWitnessSet(wsHex);
        if (jsonOutput) {
          printJson(decoded);
        } else {
          printWitnessSet(decoded);
        }
        break;
      }

      case "decode-datum": {
        const datumInput = filteredArgs[1];
        if (!datumInput) {
          console.error("Error: Missing datum hex or file path");
          process.exit(1);
        }
        const datumHex = readHexInput(datumInput);
        const decoded = decodePlutusData(datumHex);
        printJson(decoded);
        break;
      }

      case "compare": {
        const tx1Input = filteredArgs[1];
        const tx2Input = filteredArgs[2];
        if (!tx1Input || !tx2Input) {
          console.error("Error: Need two transaction hex values or file paths to compare");
          process.exit(1);
        }
        const tx1Hex = readHexInput(tx1Input);
        const tx2Hex = readHexInput(tx2Input);
        const tx1 = decodeTransaction(tx1Hex);
        const tx2 = decodeTransaction(tx2Hex);
        if (jsonOutput) {
          const result = compareTransactions(tx1, tx2);
          printJson({ tx1, tx2, comparison: result });
        } else {
          printComparison(tx1, tx2);
        }
        break;
      }

      case "compare-witness": {
        const ws1Input = filteredArgs[1];
        const ws2Input = filteredArgs[2];
        if (!ws1Input || !ws2Input) {
          console.error("Error: Need two witness set hex values or file paths to compare");
          process.exit(1);
        }
        const ws1Hex = readHexInput(ws1Input);
        const ws2Hex = readHexInput(ws2Input);
        const ws1 = decodeWitnessSet(ws1Hex);
        const ws2 = decodeWitnessSet(ws2Hex);
        printJson({ ws1, ws2 });
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
