import { describe, it, expect } from "vitest";
import { decodeTransaction, decodeWitnessSet, decodePlutusData } from "./decoder.js";

// Sample transaction hex from a real Cardano transaction
const SAMPLE_TX_HEX =
  "84a700d901028282582008c49c049c49a665cbb83644b22662af7125a8ecd365a616b82388a1a7bb551000825820c4e43afd34dd0ad3340b495e7a58f0be40691b04b556f1ab52419927f4df5b8b00018383583911a76f0fb801a29f591e9871576508d85b0b5f3c38774f65032f58fdad5139e81456c1b4e2f0af22c1e94ff22ea648588b03a7c7914b6eb256821a001430a2a1581c3373f1171594fc4be7f7e3a099252cd085a9734a5dfe4732e2311921a14d576f6e6465724d696c6b303935015820e735f209d58839f565e0190d00b9f6619b93793bdb45647256c29af4e4983af883583911a76f0fb801a29f591e9871576508d85b0b5f3c38774f65032f58fdad5139e81456c1b4e2f0af22c1e94ff22ea648588b03a7c7914b6eb256821a001430a2a1581c3373f1171594fc4be7f7e3a099252cd085a9734a5dfe4732e2311921a14d576f6e6465724d696c6b303136015820493a91d5154bbf1e0f0ce025f84b0b052418c1fe62e93e8dd7b974b1da85d12882583901c8d25b5c76b19bda9c88a0120a2dbcdc2ddd3f82921aa98ca35854285139e81456c1b4e2f0af22c1e94ff22ea648588b03a7c7914b6eb2561a164cd26b021a00036a51031a0a8ac2e307582010d70a7bf1ff1ed57b4ac55c6ed323880724390905b3f69b92615166c3ac9699081a0a8aa6b30b58205e4edebba50f3bf7be0d7ff7e07619b63d4edea30be0de8f641e5561206ef921a104d901029fd8799f9fd8799fd8799fd8799f581cc8d25b5c76b19bda9c88a0120a2dbcdc2ddd3f82921aa98ca3585428ffd8799fd8799fd8799f581c5139e81456c1b4e2f0af22c1e94ff22ea648588b03a7c7914b6eb256ffffffff1a0a7d8c00ffd8799fd8799fd8799f581cd3854a7de25ea94326fec3b65ac36f20d59930118d83fead972d600effd8799fd8799fd8799f581c11a0974ad3660a0ffca16e2c72cce55033f225ee9a9f39fe23686209ffffffff1a01312d00ffff581cc8d25b5c76b19bda9c88a0120a2dbcdc2ddd3f82921aa98ca3585428ffd8799f9fd8799fd8799fd8799f581cc8d25b5c76b19bda9c88a0120a2dbcdc2ddd3f82921aa98ca3585428ffd8799fd8799fd8799f581c5139e81456c1b4e2f0af22c1e94ff22ea648588b03a7c7914b6eb256ffffffff1a0fbc5200ffd8799fd8799fd8799f581cd3854a7de25ea94326fec3b65ac36f20d59930118d83fead972d600effd8799fd8799fd8799f581c11a0974ad3660a0ffca16e2c72cce55033f225ee9a9f39fe23686209ffffffff1a01c9c380ffff581cc8d25b5c76b19bda9c88a0120a2dbcdc2ddd3f82921aa98ca3585428fffff5a11902a2a1636d7367715761797570205472616e73616374696f6e";

describe("decodeTransaction", () => {
  it("decodes a valid transaction", () => {
    const result = decodeTransaction(SAMPLE_TX_HEX);

    expect(result.scriptDataHash).toBe(
      "5e4edebba50f3bf7be0d7ff7e07619b63d4edea30be0de8f641e5561206ef921"
    );
    expect(result.inputCount).toBe(2);
    expect(result.outputCount).toBe(3);
    expect(result.fee).toBe("223825");
    expect(result.inputs).toHaveLength(2);
  });

  it("extracts inputs in correct order", () => {
    const result = decodeTransaction(SAMPLE_TX_HEX);

    expect(result.inputs[0].txHash).toBe(
      "08c49c049c49a665cbb83644b22662af7125a8ecd365a616b82388a1a7bb5510"
    );
    expect(result.inputs[0].index).toBe(0);
  });

  it("extracts witness set with plutus data", () => {
    const result = decodeTransaction(SAMPLE_TX_HEX);

    expect(result.witnessSet.plutusData).toBeDefined();
    expect(result.witnessSet.plutusData).toHaveLength(2);
  });

  it("throws on invalid hex", () => {
    expect(() => decodeTransaction("invalid")).toThrow();
  });
});

describe("decodePlutusData", () => {
  const SAMPLE_DATUM_HEX =
    "d8799f9fd8799fd8799fd8799f581cc8d25b5c76b19bda9c88a0120a2dbcdc2ddd3f82921aa98ca3585428ffd8799fd8799fd8799f581c5139e81456c1b4e2f0af22c1e94ff22ea648588b03a7c7914b6eb256ffffffff1a0a7d8c00ffff581cc8d25b5c76b19bda9c88a0120a2dbcdc2ddd3f82921aa98ca3585428ff";

  it("decodes plutus data to JSON", () => {
    const result = decodePlutusData(SAMPLE_DATUM_HEX);

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("throws on invalid hex", () => {
    expect(() => decodePlutusData("invalid")).toThrow();
  });
});
