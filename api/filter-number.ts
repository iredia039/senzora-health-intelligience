import { prisma } from "./prisma";

async function main() {
  try {
    const user = await prisma.user.findMany({
      where: {
        id: {
          gt: 6,
        },
      },
    });
    console.dir(user, { depth: null });
  } catch (error) {
    console.log(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();