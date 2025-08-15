import { Lucid, Blockfrost, Network } from "lucid-cardano";
import * as CSL from "@emurgo/cardano-serialization-lib-nodejs";

let lucidInstance: Lucid | null = null;

export async function getLucid(): Promise<Lucid> {
  if (lucidInstance) return lucidInstance;

  const rawNetwork = process.env.CARDANO_NETWORK || "Preprod";
  const network = (rawNetwork as Network) || "Preprod";
  const apiKey = process.env.BLOCKFROST_API_KEY;

  if (!apiKey) {
    throw new Error("BLOCKFROST_API_KEY is not configured");
  }

  const baseUrl = network === "Mainnet"
    ? "https://cardano-mainnet.blockfrost.io/api/v0"
    : "https://cardano-preprod.blockfrost.io/api/v0";

  // Ensure Lucid uses the NodeJS serialization library
  const lucid = await Lucid.new(new Blockfrost(baseUrl, apiKey), network);

  // Try mnemonic first, fallback to signing key
  const mnemonic = process.env.MINTING_MNEMONIC;
  const signingKey = process.env.MINTING_SIGNING_KEY;
  
  if (mnemonic) {
    await lucid.selectWalletFromSeed(mnemonic);
  } else if (signingKey) {
    await lucid.selectWalletFromPrivateKey(signingKey);
  } else {
    throw new Error("Either MINTING_MNEMONIC or MINTING_SIGNING_KEY must be set in your environment.");
  }

  lucidInstance = lucid;
  return lucidInstance;
}


