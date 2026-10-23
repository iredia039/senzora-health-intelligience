const bcrypt = require('bcrypt')

async function hashing() {
    try {
            // const data = {
    //     email:req.body.email,
    //     password:req.body.password
    // }

    // const hashed = await bcrypt.hash(data.password, 10)
    const word = 'kyouko123'

    const hashed = await bcrypt.hash(word, 10)

    const pass = 'kyouko123'
    const newHash = await bcrypt.hash(pass, 10)

    const comp = await bcrypt.compare(word, hashed)
    console.log(comp);
    const secondComp = await bcrypt.compare(pass, newHash)
    console.log(secondComp);
    const third = await bcrypt.compare('miyamura123',   hashed)
    console.log(third);
    const fourth = await bcrypt.compare('Kyouko123', hashed)
    console.log(fourth);
    
    
    
    
    console.log(newHash);
    
    console.log(hashed);
    } catch (error) {
        console.log(error);
        
    }    
}

hashing()