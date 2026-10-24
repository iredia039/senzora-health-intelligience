const { prisma } = require("./prisma")

async function main() {
    try {
            const data = await prisma.pet.findUnique({
        where:{ id: 183}
    })

    console.log(data);

    const get = await prisma.pet.findMany({
        where:{ ownerId: 15 }
    })

    console.log(get);

    const newPet = await prisma.pet.delete({

        where:{ id: 14}
    })

    console.log(newPet);
    
    
    
    } catch (error) {
        console.log(error)
    }

    finally{
        await prisma.$disconnect()
    }
}

main()