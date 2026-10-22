import { prisma } from "./prisma";

async function main() {
  try {
    // Both conditions must pass
    const both = await prisma.user.findMany({
      where: {
        name: { contains: 'a', mode: "insensitive" },
        id: { gt: 6 },
      },
    });

    // Only one condition has to pass
    const either = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: 'a', mode: "insensitive" } },
          { id: { gt: 6 } },
        ],
      },
    });

    console.dir(both, { depth: null });
    console.dir(either, { depth: null });
  } catch (error) {
    console.log(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();