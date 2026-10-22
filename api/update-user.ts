import { prisma } from "./prisma";

async function main() {
    try {
            const user = await prisma.user.update({
        where:{
            id: 99
        },

        data:{
            phone: null,
            name: 'izumo'
        }
    })
    console.log(user);
    
    } catch (error) {
        console.log(error);
        
    }
    finally{
        await prisma.$disconnect()
    }
}

main()