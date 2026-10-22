import { prisma } from "./prisma";

async function main() {
    try {
           const person = await prisma.user.create({
        data:{
            name: 'akari',
            email:'watanabe@gmail.com'
        }
    })

               const personTwo = await prisma.user.create({
        data:{
            name: 'tenka',
            email:'tenka@gmail.com'
        }
    })
    console.log(person, personTwo);
    } catch (error) {
        console.log(error)
    }
    finally{
await prisma.$disconnect()
}
} 


main()
