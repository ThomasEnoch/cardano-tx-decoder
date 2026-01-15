import { describe, it, expect } from "vitest";
import { compareTransactions, compareWitnessSets } from "./compare.js";
import type { DecodedTransaction, DecodedWitnessSet } from "./types.js";

describe("compareWitnessSets", () => {
  it("returns empty array when witness sets match", () => {
    const ws: DecodedWitnessSet = {
      plutusData: [{ index: 0, hex: "abc123", json: { test: 1 } }],
    };

    const result = compareWitnessSets(ws, ws);
    expect(result).toEqual([]);
  });

  it("detects plutus data count difference", () => {
    const ws1: DecodedWitnessSet = {
      plutusData: [{ index: 0, hex: "abc", json: {} }],
    };
    const ws2: DecodedWitnessSet = {
      plutusData: [
        { index: 0, hex: "abc", json: {} },
        { index: 1, hex: "def", json: {} },
      ],
    };

    const result = compareWitnessSets(ws1, ws2);
    expect(result).toContain("Plutus data count differs: 1 vs 2");
  });

  it("detects plutus data hex difference", () => {
    const ws1: DecodedWitnessSet = {
      plutusData: [{ index: 0, hex: "abc123", json: { value: 1 } }],
    };
    const ws2: DecodedWitnessSet = {
      plutusData: [{ index: 0, hex: "def456", json: { value: 2 } }],
    };

    const result = compareWitnessSets(ws1, ws2);
    expect(result.some((d) => d.includes("Plutus data at index 0 differs"))).toBe(true);
  });

  it("handles empty witness sets", () => {
    const result = compareWitnessSets({}, {});
    expect(result).toEqual([]);
  });
});

describe("compareTransactions", () => {
  const baseTx: DecodedTransaction = {
    scriptDataHash: "abc123",
    inputCount: 1,
    outputCount: 1,
    fee: "1000",
    ttl: "100",
    validityStart: null,
    requiredSigners: [],
    witnessSet: {},
    inputs: [{ txHash: "tx1", index: 0 }],
  };

  it("returns all matches when transactions are identical", () => {
    const result = compareTransactions(baseTx, baseTx);

    expect(result.scriptDataHashMatch).toBe(true);
    expect(result.inputOrderMatch).toBe(true);
    expect(result.witnessSetDifferences).toEqual([]);
    expect(result.inputDifferences).toEqual([]);
  });

  it("detects script data hash mismatch", () => {
    const tx2 = { ...baseTx, scriptDataHash: "different" };
    const result = compareTransactions(baseTx, tx2);

    expect(result.scriptDataHashMatch).toBe(false);
  });

  it("detects input order difference", () => {
    const tx2 = { ...baseTx, inputs: [{ txHash: "tx2", index: 0 }] };
    const result = compareTransactions(baseTx, tx2);

    expect(result.inputOrderMatch).toBe(false);
    expect(result.inputDifferences.length).toBeGreaterThan(0);
  });
});
