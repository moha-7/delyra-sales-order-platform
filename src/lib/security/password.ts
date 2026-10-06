import argon2 from "argon2";

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) {
    throw new Error("Password must contain at least 12 characters");
  }

  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  passwordHash: string,
  candidate: string,
): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, candidate);
  } catch {
    return false;
  }
}
