import { prisma } from "./prisma";

async function main() {
    try {
            const pet = await prisma.pet.create({
        data:{
            name: 'pinkchu',
            species: 'pokemon',
            ownerId: 8
        }
    })

    console.log(pet);
    
    } catch (error) {
        console.log(error);
        
    }

    finally{
        await prisma.$disconnect()
    }
}

main()