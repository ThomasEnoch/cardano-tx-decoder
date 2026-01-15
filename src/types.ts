export interface DecodedDatum {
  index: number;
  hex: string;
  json: unknown;
}

export interface DecodedRedeemer {
  tag: string;
  index: string;
  dataHex: string;
  dataJson: unknown;
  exUnits: {
    mem: string;
    steps: string;
  };
}

export interface DecodedWitnessSet {
  plutusData?: DecodedDatum[];
  redeemers?: DecodedRedeemer[];
  plutusScriptHashes?: string[];
  nativeScriptCount?: number;
  vkeyCount?: number;
  bootstrapCount?: number;
}

export interface DecodedInput {
  txHash: string;
  index: number;
}

export interface DecodedTransaction {
  scriptDataHash: string | null;
  inputCount: number;
  outputCount: number;
  fee: string;
  ttl: string | null;
  validityStart: string | null;
  requiredSigners: string[];
  witnessSet: DecodedWitnessSet;
  inputs: DecodedInput[];
}

export interface ComparisonResult {
  scriptDataHashMatch: boolean;
  inputOrderMatch: boolean;
  witnessSetDifferences: string[];
  inputDifferences: string[];
}
