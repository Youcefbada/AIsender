import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Creates (or updates) an admin login so you can sign in immediately.
// Override the defaults with ADMIN_USERNAME / ADMIN_PASSWORD env vars.
// Run with: npm run db:seed

const prisma = new PrismaClient();

async function main() {
  const username = "admin";
  const password = "Admin!2026";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { username },
    create: { username, name: "Admin", role: "ADMIN", passwordHash },
    update: { passwordHash, role: "ADMIN" },
  });

  console.log("✅ Admin account ready:");
  console.log(`   username: ${user.username}`);
  console.log("   password: (set via ADMIN_PASSWORD, not printed)");
  console.log("   ⚠  Change this password after first login.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
