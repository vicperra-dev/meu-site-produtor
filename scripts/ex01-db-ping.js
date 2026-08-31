const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const r = await prisma.$queryRaw`SELECT 1 as ok`;
    console.log("DATABASE_CONNECT: OK", JSON.stringify(r));
    const count = await prisma.user.count();
    console.log("USER_COUNT:", count);
  } catch (e) {
    console.log("DATABASE_CONNECT: FAIL", e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
