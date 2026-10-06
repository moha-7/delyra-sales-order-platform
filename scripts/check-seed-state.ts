import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const [users, roles, userRoles, rolePermissions] = await Promise.all([
    db.user.count(),
    db.role.count(),
    db.userRole.count(),
    db.rolePermission.count(),
  ]);

  console.table({
    users,
    roles,
    userRoles,
    rolePermissions,
  });

  const accounts = await db.user.findMany({
    select: {
      email: true,
      displayName: true,
      status: true,
    },
    orderBy: { email: "asc" },
  });

  console.table(accounts);
} finally {
  await db.$disconnect();
}
