import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/security/password";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  throw new Error("Usage: npm run user:reset-password -- user@northstar.example");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const temporaryPassword = randomBytes(12).toString("base64url");

try {
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(temporaryPassword),
        forcePasswordChange: true,
        sessionVersion: { increment: 1 },
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    db.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  console.log(`Temporary password for ${email}: ${temporaryPassword}`);
  console.log("The user must change it at the next sign-in.");
} finally {
  await db.$disconnect();
}
