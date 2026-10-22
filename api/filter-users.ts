import { prisma } from "./prisma";

async function main() {
    try {
        const user = await prisma.user.findMany({
            where:{
                name:{
                    contains: 'a',
                    mode: 'insensitive'
                }
            }
        })

       console.dir(user, { depth: null })
        
    } catch (error) {
        console.log(error);
        
    }

    finally{
        await prisma.$disconnect()
    }
}

main()