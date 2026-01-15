import type {
  DecodedWitnessSet,
  DecodedTransaction,
  DecodedDatum,
  DecodedRedeemer,
  ComparisonResult,
} from "./types.js";

/**
 * Compare two witness sets and return detailed differences
 */
export function compareWitnessSets(
  ws1: DecodedWitnessSet,
  ws2: DecodedWitnessSet,
): string[] {
  return [
    ...comparePlutusData(ws1.plutusData ?? [], ws2.plutusData ?? []),
    ...compareRedeemers(ws1.redeemers ?? [], ws2.redeemers ?? []),
    ...compareScriptHashes(ws1.plutusScriptHashes ?? [], ws2.plutusScriptHashes ?? []),
  ];
}

function comparePlutusData(pd1: DecodedDatum[], pd2: DecodedDatum[]): string[] {
  if (pd1.length !== pd2.length) {
    return [`Plutus data count differs: ${pd1.length} vs ${pd2.length}`];
  }

  return pd1.flatMap((datum, i) => {
    if (datum.hex === pd2[i].hex) return [];
    return [
      `Plutus data at index ${i} differs`,
      `  TX1: ${datum.hex.slice(0, 80)}...`,
      `  TX2: ${pd2[i].hex.slice(0, 80)}...`,
      ...findJsonDifferences(datum.json, pd2[i].json, "  "),
    ];
  });
}

function compareRedeemers(r1: DecodedRedeemer[], r2: DecodedRedeemer[]): string[] {
  if (r1.length !== r2.length) {
    return [`Redeemer count differs: ${r1.length} vs ${r2.length}`];
  }

  return r1.flatMap((redeemer, i) => {
    const other = r2[i];
    const diffs: string[] = [];

    if (redeemer.tag !== other.tag) {
      diffs.push(`Redeemer ${i} tag differs: ${redeemer.tag} vs ${other.tag}`);
    }
    if (redeemer.index !== other.index) {
      diffs.push(`Redeemer ${i} index differs: ${redeemer.index} vs ${other.index}`);
    }
    if (redeemer.dataHex !== other.dataHex) {
      diffs.push(
        `Redeemer ${i} data differs`,
        `  TX1: ${redeemer.dataHex.slice(0, 80)}...`,
        `  TX2: ${other.dataHex.slice(0, 80)}...`,
      );
    }
    if (redeemer.exUnits.mem !== other.exUnits.mem || redeemer.exUnits.steps !== other.exUnits.steps) {
      diffs.push(
        `Redeemer ${i} exUnits differs: (${redeemer.exUnits.mem}, ${redeemer.exUnits.steps}) vs (${other.exUnits.mem}, ${other.exUnits.steps})`,
      );
    }

    return diffs;
  });
}

function compareScriptHashes(ps1: string[], ps2: string[]): string[] {
  if (ps1.length !== ps2.length) {
    return [`Plutus script count differs: ${ps1.length} vs ${ps2.length}`];
  }

  return ps1.flatMap((hash, i) =>
    hash !== ps2[i]
      ? [`Plutus script hash at index ${i} differs`, `  TX1: ${hash}`, `  TX2: ${ps2[i]}`]
      : [],
  );
}

/**
 * Compare two decoded transactions
 */
export function compareTransactions(
  tx1: DecodedTransaction,
  tx2: DecodedTransaction,
): ComparisonResult {
  const inputDifferences = compareInputs(tx1.inputs, tx2.inputs);

  return {
    scriptDataHashMatch: tx1.scriptDataHash === tx2.scriptDataHash,
    inputOrderMatch: inputDifferences.length === 0,
    witnessSetDifferences: compareWitnessSets(tx1.witnessSet, tx2.witnessSet),
    inputDifferences,
  };
}

function compareInputs(
  inputs1: DecodedTransaction["inputs"],
  inputs2: DecodedTransaction["inputs"],
): string[] {
  if (inputs1.length !== inputs2.length) {
    return [`Input count differs: ${inputs1.length} vs ${inputs2.length}`];
  }

  return inputs1.flatMap((input, i) => {
    const other = inputs2[i];
    if (input.txHash === other.txHash && input.index === other.index) return [];
    return [
      `Input at position ${i} differs (affects redeemer indices!)`,
      `  TX1: ${input.txHash}#${input.index}`,
      `  TX2: ${other.txHash}#${other.index}`,
    ];
  });
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
