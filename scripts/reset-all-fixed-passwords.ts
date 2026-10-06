import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  UserStatus,
} from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/security/password";

const password = process.argv[2]?.trim() || "test12345678";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const users = await db.user.findMany({
    where: {
      archivedAt: null,
    },
    select: {
      id: true,
      email: true,
    },
    orderBy: {
      email: "asc",
    },
  });

  if (users.length === 0) {
    throw new Error(
      "No users were found. Run npm run db:seed first.",
    );
  }

  const passwordHash = await hashPassword(password);

  for (const user of users) {
    await db.$transaction([
      db.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash,
          forcePasswordChange: true,
          sessionVersion: {
            increment: 1,
          },
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: UserStatus.ACTIVE,
          archivedAt: null,
        },
      }),
      db.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

    console.log(`UPDATED - ${user.email}`);
  }

  console.log("");
  console.log(`Updated ${users.length} users.`);
  console.log(`Temporary password: ${password}`);
  console.log("Every user must change it after sign-in.");
} finally {
  await db.$disconnect();
}
