import {
  Transaction,
  TransactionWitnessSet,
} from "@emurgo/cardano-serialization-lib-nodejs-gc";
import type {
  DecodedDatum,
  DecodedRedeemer,
  DecodedWitnessSet,
  DecodedTransaction,
  DecodedInput,
} from "./types.js";

/**
 * Decode a witness set from hex
 */
export function decodeWitnessSet(witnessHex: string): DecodedWitnessSet {
  const witnessSet = TransactionWitnessSet.from_hex(witnessHex);
  const result: DecodedWitnessSet = {};

  // Plutus Data (datums)
  const plutusData = witnessSet.plutus_data();
  if (plutusData && plutusData.len() > 0) {
    result.plutusData = [];
    for (let i = 0; i < plutusData.len(); i++) {
      const datum = plutusData.get(i);
      result.plutusData.push({
        index: i,
        hex: datum.to_hex(),
        json: JSON.parse(datum.to_json()),
      });
    }
  }

  // Redeemers
  const redeemers = witnessSet.redeemers();
  if (redeemers && redeemers.len() > 0) {
    result.redeemers = [];
    for (let i = 0; i < redeemers.len(); i++) {
      const redeemer = redeemers.get(i);
      result.redeemers.push({
        tag: redeemer.tag().to_json(),
        index: redeemer.index().to_str(),
        dataHex: redeemer.data().to_hex(),
        dataJson: JSON.parse(redeemer.data().to_json()),
        exUnits: {
          mem: redeemer.ex_units().mem().to_str(),
          steps: redeemer.ex_units().steps().to_str(),
        },
      });
    }
  }

  // Plutus Scripts
  const plutusScripts = witnessSet.plutus_scripts();
  if (plutusScripts && plutusScripts.len() > 0) {
    result.plutusScriptHashes = [];
    for (let i = 0; i < plutusScripts.len(); i++) {
      const script = plutusScripts.get(i);
      result.plutusScriptHashes.push(script.hash().to_hex());
    }
  }

  // Counts for other witness types
  const nativeScripts = witnessSet.native_scripts();
  if (nativeScripts) {
    result.nativeScriptCount = nativeScripts.len();
  }

  const vkeys = witnessSet.vkeys();
  if (vkeys) {
    result.vkeyCount = vkeys.len();
  }

  const bootstraps = witnessSet.bootstraps();
  if (bootstraps) {
    result.bootstrapCount = bootstraps.len();
  }

  return result;
}

/**
 * Decode a full transaction from hex
 */
export function decodeTransaction(txHex: string): DecodedTransaction {
  const tx = Transaction.from_hex(txHex);
  const body = tx.body();

  const inputs: DecodedInput[] = [];
  const txInputs = body.inputs();
  for (let i = 0; i < txInputs.len(); i++) {
    const input = txInputs.get(i);
    inputs.push({
      txHash: input.transaction_id().to_hex(),
      index: input.index(),
    });
  }

  const requiredSigners: string[] = [];
  const signers = body.required_signers();
  if (signers) {
    for (let i = 0; i < signers.len(); i++) {
      requiredSigners.push(signers.get(i).to_hex());
    }
  }

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
  const { PlutusData } = require("@emurgo/cardano-serialization-lib-nodejs-gc");
  const data = PlutusData.from_hex(hex);
  return JSON.parse(data.to_json());
}
