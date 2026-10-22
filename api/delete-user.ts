import { prisma } from "./prisma";

async function main() {
  try {
    const deleted = await prisma.user.delete({
      where: {
        id: 2
      },
    });
    console.log(deleted);
  } catch (error) {
    console.log(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();