import {
  Transaction,
  TransactionWitnessSet,
  PlutusData,
  PlutusDatumSchema,
} from "@emurgo/cardano-serialization-lib-nodejs-gc";
import type {
  DecodedDatum,
  DecodedRedeemer,
  DecodedWitnessSet,
  DecodedTransaction,
  DecodedInput,
} from "./types.js";

/** Helper to convert CSL list-like objects to arrays */
function toArray<T>(list: { len(): number; get(i: number): T } | undefined): T[] {
  if (!list || list.len() === 0) return [];
  return Array.from({ length: list.len() }, (_, i) => list.get(i));
}

/**
 * Decode a witness set from hex
 */
export function decodeWitnessSet(witnessHex: string): DecodedWitnessSet {
  const witnessSet = TransactionWitnessSet.from_hex(witnessHex);

  const plutusData = toArray(witnessSet.plutus_data()).map((datum, index) => ({
    index,
    hex: datum.to_hex(),
    json: JSON.parse(datum.to_json(PlutusDatumSchema.DetailedSchema)),
  }));

  const redeemers = toArray(witnessSet.redeemers()).map((redeemer) => ({
    tag: redeemer.tag().to_json(),
    index: redeemer.index().to_str(),
    dataHex: redeemer.data().to_hex(),
    dataJson: JSON.parse(redeemer.data().to_json(PlutusDatumSchema.DetailedSchema)),
    exUnits: {
      mem: redeemer.ex_units().mem().to_str(),
      steps: redeemer.ex_units().steps().to_str(),
    },
  }));

  const plutusScriptHashes = toArray(witnessSet.plutus_scripts()).map((script) =>
    script.hash().to_hex()
  );

  return {
    ...(plutusData.length > 0 && { plutusData }),
    ...(redeemers.length > 0 && { redeemers }),
    ...(plutusScriptHashes.length > 0 && { plutusScriptHashes }),
    ...(witnessSet.native_scripts()?.len() && { nativeScriptCount: witnessSet.native_scripts()!.len() }),
    ...(witnessSet.vkeys()?.len() && { vkeyCount: witnessSet.vkeys()!.len() }),
    ...(witnessSet.bootstraps()?.len() && { bootstrapCount: witnessSet.bootstraps()!.len() }),
  };
}

/**
 * Decode a full transaction from hex
 */
export function decodeTransaction(txHex: string): DecodedTransaction {
  const tx = Transaction.from_hex(txHex);
  const body = tx.body();

  const inputs = toArray(body.inputs()).map((input) => ({
    txHash: input.transaction_id().to_hex(),
    index: input.index(),
  }));

  const requiredSigners = toArray(body.required_signers()).map((s) => s.to_hex());

  return {
    scriptDataHash: body.script_data_hash()?.to_hex() ?? null,
    inputCount: body.inputs().len(),
    outputCount: body.outputs().len(),
    fee: body.fee().to_str(),
    ttl: body.ttl_bignum()?.to_str() ?? null,
    validityStart: body.validity_start_interval_bignum()?.to_str() ?? null,
    requiredSigners,
    witnessSet: decodeWitnessSet(tx.witness_set().to_hex()),
    inputs,
  };
}

/**
 * Decode plutus data from hex to readable JSON
 */
export function decodePlutusData(hex: string): unknown {
  const data = PlutusData.from_hex(hex);
  return JSON.parse(data.to_json(PlutusDatumSchema.DetailedSchema));
}
