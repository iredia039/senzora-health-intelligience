import { Prisma } from "./generated/prisma/client";
import { prisma } from "./prisma";

async function main() {
    try {
    const getUsers = await prisma.user.findMany({
        orderBy:{
            createdAt: 'desc'
        }
    })

    const getPets = await prisma.pet.findMany()
    console.log(getUsers);
    console.log(getUsers.length);
    console.log(getUsers.map((n) => (
        n.name
    )));
    
    console.log(getPets);
    
    
    
        
    } catch (error) {
        console.log(error)
    }

    finally{
        await prisma.$disconnect()
    }
}

main()