import { createPrivateKey, sign as cryptoSign } from "crypto";
import { sha256Hex } from "@/lib/security";

// Cabecera DER PKCS#8 RFC 8410 para semilla cruda Ed25519 de 32 bytes
const PKCS8_ED25519_PREFIX = Buffer.from(
  "302e020100300506032b657004220420",
  "hex",
);

function getEd25519PrivateKey() {
  const hex = process.env.LEGION_ED25519_PRIVATE_KEY_HEX?.trim() || "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("LEGION_ED25519_PRIVATE_KEY_HEX ausente o invalida (64 hex chars): fail-closed");
  }
  const seed = Buffer.from(hex, "hex");
  return createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
}

export function dateToYmdUtc(d: Date): number {
  return (
    d.getUTCFullYear() * 10000 +
    (d.getUTCMonth() + 1) * 100 +
    d.getUTCDate()
  );
}

export function computeValidUntilEpoch(
  leaseUntil: Date | null | undefined,
  now = new Date(),
): number {
  if (!leaseUntil) return 0;
  if (now.getTime() >= leaseUntil.getTime()) {
    // Superada la ventana de 35 dias sin contracargos -> certificado perpetuo (0)
    return 0;
  }
  return Math.floor(leaseUntil.getTime() / 1000);
}

/**
 * Construye y firma el token binario LGN1 (40B payload + 64B Ed25519 = 144 ASCII chars)
 * 100% compatible con Legion_SuperPanel_v3_15_MT4.mq4
 */
export function signLegionLicenseToken(input: {
  shortId: number;
  validUntilEpoch: number;
  updatesUntilYmd: number;
  accounts: [string | null | undefined, string | null | undefined, string | null | undefined];
}): { token: string; sha256: string } {
  const privateKey = getEd25519PrivateKey();

  const payload = Buffer.alloc(40);
  payload.write("LGN1", 0, 4, "ascii");
  payload.writeUInt32BE(input.shortId >>> 0, 4);
  payload.writeUInt32BE(input.validUntilEpoch >>> 0, 8);
  payload.writeUInt32BE(input.updatesUntilYmd >>> 0, 12);

  for (let i = 0; i < 3; i++) {
    const raw = (input.accounts[i] || "").trim();
    const val = raw ? BigInt(raw) : 0n;
    if (val < 0n || val > 18446744073709551615n) {
      throw new Error(`Numero de cuenta MT4 fuera de rango en slot ${i + 1}`);
    }
    payload.writeBigUInt64BE(val, 16 + i * 8);
  }

  const signature = cryptoSign(null, payload, privateKey);
  if (signature.length !== 64) {
    throw new Error("Firma Ed25519 invalida");
  }

  const token = `LGN1-${Buffer.concat([payload, signature]).toString("base64url")}`;
  return {
    token,
    sha256: sha256Hex(token),
  };
}


