import { prisma } from "./prisma";

async function main() {
    try {
            const all = await prisma.pet.findMany()
    console.log(all);
    } catch (error) {
        console.log(error);
        
    }    

    finally{
        await prisma.$disconnect()
    }
}

main()