import { prisma } from "./prisma";

async function main() {
  try {
    const user = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      where:{
        name:{
            contains: 'a'
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    console.dir(user, { depth: null });
  } catch (error) {
    console.log(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();