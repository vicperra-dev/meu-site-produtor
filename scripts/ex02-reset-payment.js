const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  const asaasId = "pay_o7t2umh7fecupg7r";
  const deleted = await prisma.payment.deleteMany({ where: { asaasId } });
  console.log("deleted_payments", deleted.count);
  await prisma.$disconnect();
}

main();
