import { fromText } from "lucid-cardano";
import { getPolicy } from "./policy";

export async function mintSkinNFT(params: {
  toAddress: string;
  name: string;
  image: string; // URL
  rarity: string;
  value: number;
  caseOpeningId: string;
}) {
  const { lucid, nativeScript, policyId } = await getPolicy();

  const assetNameBytes = fromText(params.name).slice(0, 32);
  const unit = policyId + assetNameBytes;

  const metadata = {
    721: {
      [policyId]: {
        [params.name]: {
          name: params.name,
          image: params.image,
          mediaType: "image/png",
          attributes: {
            rarity: params.rarity,
            mintValue: params.value,
            caseOpeningId: params.caseOpeningId,
          },
        },
      },
    },
  } as any;

  const tx = await lucid
    .newTx()
    .mintAssets({ [unit]: BigInt(1) }, nativeScript as any)
    .attachMetadata(721, metadata)
    // Send the NFT with minimum ADA to satisfy UTxO requirements
    .payToAddress(params.toAddress, { lovelace: 2_000_000n, [unit]: 1n })
    .complete();

  const signed = await tx.sign().complete();
  const txHash = await signed.submit();

  return { txHash, assetUnit: unit, policyId };
}


