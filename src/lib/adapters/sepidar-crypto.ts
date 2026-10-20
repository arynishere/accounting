import {
  createCipheriv,
  createDecipheriv,
  createHash,
  publicEncrypt,
  randomBytes,
  constants,
} from "crypto";
import { randomUUID } from "crypto";

/** IntegrationID = چهار رقم اول سمت چپ سریال (مثلاً 10017ff3 → 1001) */
export function integrationIdFromSerial(serial: string): number {
  const digits = serial.replace(/\D/g, "").slice(0, 4);
  if (!digits) {
    throw new Error("سریال دستگاه سپیدار نامعتبر است");
  }
  return Number(digits);
}

/** کلید AES = سریال دوبل کنار هم (مستند سپیدار) */
function aesKeyFromSerial(serial: string): Buffer {
  return Buffer.from(serial + serial, "utf8");
}

export function encryptIntegrationId(serial: string, integrationId: number) {
  const key = aesKeyFromSerial(serial);
  const iv = randomBytes(16);
  const cipher = createCipheriv(
    key.length === 16 ? "aes-128-cbc" : "aes-256-cbc",
    key,
    iv,
  );
  const encrypted = Buffer.concat([
    cipher.update(String(integrationId), "utf8"),
    cipher.final(),
  ]);
  return {
    Cypher: encrypted.toString("base64"),
    IV: iv.toString("base64"),
  };
}

export function decryptPublicKeyXml(
  serial: string,
  cypherB64: string,
  ivB64: string,
): string {
  const key = aesKeyFromSerial(serial);
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(cypherB64, "base64");
  const decipher = createDecipheriv(
    key.length === 16 ? "aes-128-cbc" : "aes-256-cbc",
    key,
    iv,
  );
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8").replace(/\0+$/g, "").trim();
}

/** رمزنگاری ArbitraryCode با کلید عمومی RSA (PKCS#1 v1.5) */
export function encryptArbitraryCode(
  rsaKeyXml: string,
  arbitraryCode: string,
): string {
  const modulusMatch = rsaKeyXml.match(/<Modulus>([^<]+)<\/Modulus>/i);
  const exponentMatch = rsaKeyXml.match(/<Exponent>([^<]+)<\/Exponent>/i);
  if (!modulusMatch || !exponentMatch) {
    throw new Error("کلید عمومی RSA سپیدار نامعتبر است (RSAKeyValue)");
  }

  const modulus = Buffer.from(modulusMatch[1], "base64");
  const exponent = Buffer.from(exponentMatch[1], "base64");
  const pem = derToPem(rsaPublicKeyDer(modulus, exponent));

  const encrypted = publicEncrypt(
    {
      key: pem,
      padding: constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(arbitraryCode, "utf8"),
  );
  return encrypted.toString("base64");
}

export function md5Hex(text: string): string {
  return createHash("md5").update(text, "utf8").digest("hex");
}

export function newArbitraryCode(): string {
  return randomUUID();
}

function rsaPublicKeyDer(modulus: Buffer, exponent: Buffer): Buffer {
  const mod = toUnsignedInteger(modulus);
  const exp = toUnsignedInteger(exponent);
  const sequence = Buffer.concat([
    encodeTlv(0x02, mod),
    encodeTlv(0x02, exp),
  ]);
  const rsaEncryptionOid = Buffer.from(
    "300d06092a864886f70d0101010500",
    "hex",
  );
  const bitString = encodeTlv(
    0x03,
    Buffer.concat([Buffer.from([0x00]), encodeTlv(0x30, sequence)]),
  );
  return encodeTlv(0x30, Buffer.concat([rsaEncryptionOid, bitString]));
}

function toUnsignedInteger(buf: Buffer): Buffer {
  if (buf[0] & 0x80) return Buffer.concat([Buffer.from([0x00]), buf]);
  return buf;
}

function encodeTlv(tag: number, value: Buffer): Buffer {
  const len = value.length;
  let lenBytes: Buffer;
  if (len < 0x80) {
    lenBytes = Buffer.from([len]);
  } else if (len <= 0xff) {
    lenBytes = Buffer.from([0x81, len]);
  } else {
    lenBytes = Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
  }
  return Buffer.concat([Buffer.from([tag]), lenBytes, value]);
}

function derToPem(der: Buffer): string {
  const b64 = der.toString("base64");
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}
