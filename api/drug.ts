import { prisma } from "./prisma";

async function main() {
    try {
            const drug = await prisma.drug.createMany({
        data:[
            {
                name: 'paracetamol',
                description: 'pain killer',
                prescriptionRequired: false
            },
                        {
                name: 'ibuprofen',
                description: 'pain killer',
                prescriptionRequired: false
            },
                        {
                name: 'amoxycillin',
                description: 'anti-biotic',
                prescriptionRequired: true
            },
                                    {
                name: 'azithromycin',
                description: 'anti-biotic',
                prescriptionRequired: true
            },
        ]
    })

    console.log(drug);
    
    } catch (error) {
        console.log(error);
        
    }

    finally{
        await prisma.$disconnect()
    }
}

main()