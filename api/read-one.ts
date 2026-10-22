import { prisma } from "./prisma";

async function main() {
    try {
            const user = await prisma.user.findUnique({
        where:{
            id: 8
        }
    })

    const user2 = await prisma.user.findUnique({
        where:{
            email: 'watanabe@gmail.com'
        }
    })

        const user4 = await prisma.user.findUnique({
        where:{
            email: 'wattanabe@gmail.com'
        }
        
    })

    if (user4 === null) {
        console.log('not found');
        
    } else {
        console.log(user4);
        
    }

    //     const user3 = await prisma.user.findUnique({
    //     where:{
    //         name: 'akari'
    //     }
    // })

    console.log(user);
    console.log(user2?.name);
    // console.log(user3);
    
    
    
    } catch (error) {
        console.log(error);
        
    }

    finally{
        await prisma.$disconnect()
    }
}

main()