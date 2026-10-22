import { prisma } from "./prisma";

async function main() {
    try {
    //         const user = await prisma.user.create({
    //     data:{
    //         name: 'aizen',
    //         email: 'aizen@gmail.com',
    //         pets:{
    //             create:[{
    //                 name: 'dragon',
    //                 species: 'reptile'
    //             },
    //         {
    //             name: 'happy',
    //             species: 'cats'
    //         }]
    //         }
    //     },
    //     include:{
    //         pets: true
    //     }
    // })

    // console.log(user);

                const user2 = await prisma.user.create({
        data:{
            name: 'ihigo',
            email: 'ichigo@gmail.com',
            pets:{
                create:[{
                    name: 'dragon',
                    species: 'reptile'
                },
            {
                name: 'happy',
                species: 'cats'
            },
        {
            name: 'kon',
            species: 'bear'
        }]
            }
        },
        include:{
            pets: true
        }
    })

    console.log(user2);

    //             const user3 = await prisma.user.create({
    //     data:{
    //         name: 'marin',
    //         email: 'marin@gmail.com',
    //         pets:{
    //             create:[{
    //                 name: 'dragon',
    //                 species: 'reptile'
    //             }]
    //         }
    //     },
    //     include:{
    //         pets: true
    //     }
    // })

    // console.log(user3);

    //             const user4 = await prisma.user.create({
    //     data:{
    //         name: 'zen',
    //         email: 'zen@gmail.com'
    //     },
    //     include:{
    //         pets: true
    //     }
    // })
    
    // console.log(user4);
    
    
    } catch (error) {
        console.log(error);
        
    }

    finally{
        await prisma.$disconnect()
    }
}

main()