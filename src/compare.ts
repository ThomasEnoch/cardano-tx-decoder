import type {
  DecodedWitnessSet,
  DecodedTransaction,
  ComparisonResult,
} from "./types.js";

/**
 * Compare two witness sets and return detailed differences
 */
export function compareWitnessSets(
  ws1: DecodedWitnessSet,
  ws2: DecodedWitnessSet,
): string[] {
  const differences: string[] = [];

  // Compare plutus data count
  const pd1Count = ws1.plutusData?.length ?? 0;
  const pd2Count = ws2.plutusData?.length ?? 0;
  if (pd1Count !== pd2Count) {
    differences.push(`Plutus data count differs: ${pd1Count} vs ${pd2Count}`);
  } else if (ws1.plutusData && ws2.plutusData) {
    for (let i = 0; i < pd1Count; i++) {
      if (ws1.plutusData[i].hex !== ws2.plutusData[i].hex) {
        differences.push(`Plutus data at index ${i} differs`);
        differences.push(`  TX1: ${ws1.plutusData[i].hex.slice(0, 80)}...`);
        differences.push(`  TX2: ${ws2.plutusData[i].hex.slice(0, 80)}...`);

        // Find specific field differences
        const fieldDiffs = findJsonDifferences(
          ws1.plutusData[i].json,
          ws2.plutusData[i].json,
          "  ",
        );
        differences.push(...fieldDiffs);
      }
    }
  }

  // Compare redeemers
  const r1Count = ws1.redeemers?.length ?? 0;
  const r2Count = ws2.redeemers?.length ?? 0;
  if (r1Count !== r2Count) {
    differences.push(`Redeemer count differs: ${r1Count} vs ${r2Count}`);
  } else if (ws1.redeemers && ws2.redeemers) {
    for (let i = 0; i < r1Count; i++) {
      const r1 = ws1.redeemers[i];
      const r2 = ws2.redeemers[i];
      if (r1.tag !== r2.tag) {
        differences.push(`Redeemer ${i} tag differs: ${r1.tag} vs ${r2.tag}`);
      }
      if (r1.index !== r2.index) {
        differences.push(`Redeemer ${i} index differs: ${r1.index} vs ${r2.index}`);
      }
      if (r1.dataHex !== r2.dataHex) {
        differences.push(`Redeemer ${i} data differs`);
        differences.push(`  TX1: ${r1.dataHex.slice(0, 80)}...`);
        differences.push(`  TX2: ${r2.dataHex.slice(0, 80)}...`);
      }
      if (r1.exUnits.mem !== r2.exUnits.mem || r1.exUnits.steps !== r2.exUnits.steps) {
        differences.push(
          `Redeemer ${i} exUnits differs: (${r1.exUnits.mem}, ${r1.exUnits.steps}) vs (${r2.exUnits.mem}, ${r2.exUnits.steps})`,
        );
      }
    }
  }

  // Compare plutus scripts
  const ps1 = ws1.plutusScriptHashes ?? [];
  const ps2 = ws2.plutusScriptHashes ?? [];
  if (ps1.length !== ps2.length) {
    differences.push(`Plutus script count differs: ${ps1.length} vs ${ps2.length}`);
  } else {
    for (let i = 0; i < ps1.length; i++) {
      if (ps1[i] !== ps2[i]) {
        differences.push(`Plutus script hash at index ${i} differs`);
        differences.push(`  TX1: ${ps1[i]}`);
        differences.push(`  TX2: ${ps2[i]}`);
      }
    }
  }

  return differences;
}

/**
 * Compare two decoded transactions
 */
export function compareTransactions(
  tx1: DecodedTransaction,
  tx2: DecodedTransaction,
): ComparisonResult {
  const inputDifferences: string[] = [];

  // Compare inputs
  if (tx1.inputs.length !== tx2.inputs.length) {
    inputDifferences.push(`Input count differs: ${tx1.inputs.length} vs ${tx2.inputs.length}`);
  } else {
    for (let i = 0; i < tx1.inputs.length; i++) {
      if (
        tx1.inputs[i].txHash !== tx2.inputs[i].txHash ||
        tx1.inputs[i].index !== tx2.inputs[i].index
      ) {
        inputDifferences.push(`Input at position ${i} differs (affects redeemer indices!)`);
        inputDifferences.push(`  TX1: ${tx1.inputs[i].txHash}#${tx1.inputs[i].index}`);
        inputDifferences.push(`  TX2: ${tx2.inputs[i].txHash}#${tx2.inputs[i].index}`);
      }
    }
  }

  return {
    scriptDataHashMatch: tx1.scriptDataHash === tx2.scriptDataHash,
    inputOrderMatch: inputDifferences.length === 0,
    witnessSetDifferences: compareWitnessSets(tx1.witnessSet, tx2.witnessSet),
    inputDifferences,
  };
}

/**
 * Find differences between two JSON objects (for datum comparison)
 */
function findJsonDifferences(
  obj1: unknown,
  obj2: unknown,
  indent: string = "",
  path: string = "",
): string[] {
  const diffs: string[] = [];

  if (typeof obj1 !== typeof obj2) {
    diffs.push(`${indent}Type mismatch at ${path || "root"}: ${typeof obj1} vs ${typeof obj2}`);
    return diffs;
  }

  if (typeof obj1 === "string" && typeof obj2 === "string") {
    if (obj1 !== obj2) {
      diffs.push(`${indent}Value differs at ${path || "root"}:`);
      diffs.push(`${indent}  TX1: ${obj1}`);
      diffs.push(`${indent}  TX2: ${obj2}`);
    }
    return diffs;
  }

  if (typeof obj1 === "number" && typeof obj2 === "number") {
    if (obj1 !== obj2) {
      diffs.push(`${indent}Value differs at ${path || "root"}: ${obj1} vs ${obj2}`);
    }
    return diffs;
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      diffs.push(`${indent}Array length differs at ${path || "root"}: ${obj1.length} vs ${obj2.length}`);
    }
    const len = Math.min(obj1.length, obj2.length);
    for (let i = 0; i < len; i++) {
      diffs.push(...findJsonDifferences(obj1[i], obj2[i], indent, `${path}[${i}]`));
    }
    return diffs;
  }

  if (typeof obj1 === "object" && obj1 !== null && typeof obj2 === "object" && obj2 !== null) {
    const keys1 = Object.keys(obj1 as Record<string, unknown>);
    const keys2 = Object.keys(obj2 as Record<string, unknown>);
    const allKeys = new Set([...keys1, ...keys2]);

    for (const key of allKeys) {
      const val1 = (obj1 as Record<string, unknown>)[key];
      const val2 = (obj2 as Record<string, unknown>)[key];

      if (val1 === undefined) {
        diffs.push(`${indent}Missing in TX1: ${path}.${key}`);
      } else if (val2 === undefined) {
        diffs.push(`${indent}Missing in TX2: ${path}.${key}`);
      } else {
        diffs.push(...findJsonDifferences(val1, val2, indent, `${path}.${key}`));
      }
    }
  }

  return diffs;
}
