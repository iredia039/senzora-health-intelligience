import { prisma } from "./prisma";

async function main() {
  try {
    // const pharmacy = await prisma.pharmacy.create({
    //   data: {
    //     name: 'maomao apothecary',
    //     email: 'maomaoapothecary@gmail.com',
    //     address: '12 garden road jos',
    //     passwordHash: 'maomao',
    //     stock: {
    //       create: [
    //         { drugId: 1, quantity: 50, price: 700 },
    //         { drugId: 4, quantity: 20, price: 4000 },
    //       ],
    //     },
    //   },
    //   include: {
    //     stock: true,
    //   },
    // });

    const phar2 = await prisma.pharmacy.create({
        data:{
            name: 'jinshi herbals',
            email: 'jinshi@gmail.com',
            address: '43 crimson street abuja',
            passwordHash: 'jinshi',
            stock:{
          create:[
            {drugId: 2, quantity: 45, price:1400},
            {drugId: 3, quantity: 20, price: 2000}
          ]
        }
        },
        include:{
          stock: true
        }
    })


    // console.dir(pharmacy, { depth: null });
    console.dir(phar2, { depth: null });
  } catch (error) {
    console.log(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();