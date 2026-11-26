
import "server-only";

import { hash, verify } from "@node-rs/argon2";

export async function hashPassword(password: string) {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
) {
  return verify(hashedPassword, password);
}
