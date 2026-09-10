import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LEN = 64;

/**
 * Hash a password. Returns a string in the format:
 *   scrypt$<salt-hex>$<hash-hex>
 *
 * The salt is random per password, so two users with the same password
 * produce different hashes.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/**
 * Verify a password against a stored hash.
 * Uses timing-safe comparison so attackers can't learn anything from
 * how long the check takes.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const actual = await scrypt(password, salt, KEY_LEN);

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
