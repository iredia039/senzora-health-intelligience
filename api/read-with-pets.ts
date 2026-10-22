import { prisma } from "./prisma";

async function main() {
  try {
    const users = await prisma.user.findUnique({
      where: {
        id: 8,
      },
      include: {
        pets: true
      },
    });
    console.log(users?.pets.map((n) => (
        n.name
    )));

    const all = await prisma.user.findMany({
        include:{
            pets: true
        }
    })

    console.log(all);

    const upets = await prisma.pet.findUnique({
        where:{
            id:5
        },
        include:{
            owner: true
        }
    })

    console.log(upets);
    
    
  } catch (error) {
    console.log(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();