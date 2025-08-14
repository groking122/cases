import { getLucid } from "./cardano";

export async function getPolicy() {
  const lucid = await getLucid();
  const addr = await lucid.wallet.address();
  const { paymentCredential } = lucid.utils.getAddressDetails(addr);
  if (!paymentCredential?.hash) throw new Error("Missing payment key hash");

  const expiresAt = Number(process.env.POLICY_EXPIRES_AT_UNIX || 0);

  const nativeScript = expiresAt > 0
    ? {
        type: "all",
        scripts: [
          { type: "sig", keyHash: paymentCredential.hash },
          { type: "before", slot: expiresAt },
        ],
      }
    : { type: "sig", keyHash: paymentCredential.hash };

  const policyId = lucid.utils.mintingPolicyToId(nativeScript as any);
  return { lucid, nativeScript, policyId };
}


