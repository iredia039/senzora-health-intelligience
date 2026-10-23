const bcrypt = require('bcrypt')
const { prisma } = require('../prisma')

async function register(req, res) {
    try {
            const data = {
        name:req.body.name,
        email:req.body.email,
        password:req.body.password,
        phone:req.body.phone
    }

    if (!data.name || !data.email || !data.password) {
        return res.status(400).json({ error: 'missing fields'})
    }

    const mail = await prisma.user.findUnique({ where: {email: data.email}})

if (mail) {
    return res.status(409).json({error: 'email already exist, please use another one'})
}

    const hashed = await bcrypt.hash(data.password, 10)
    data.password = hashed

    const user = await prisma.user.create({
        data:{
            name:data.name,
            email:data.email,
            hashPassword:data.password,
            phone:data.phone
            
        }
    })

    const saved = {
        name:user.name,
        email:user.email
    }

    res.status(201).json(saved)
    } catch (error) {
        res.status(500).json({ error: 'something went wrong, please try again'})
        
    }
}

async function login(req, res) {
    try {
            const data = {
        email:req.body.email,
        password:req.body.password
    }

    if (!data.email || !data.password) {
        return res.status(400).json({ error: 'please fill the fields'})
    }

    const mail = await prisma.user.findUnique({ where:{
        email: data.email
    }})

    if (!mail) {
        return res.status(401).json({ error: 'invalid credentials'})
    }

    const compared = await bcrypt.compare(data.password, mail.hashPassword)

    if (!compared) {
        return res.status(401).json({ error: 'invalid credentials'})
    }

    res.status(200).json(mail.name)
    } catch (error) {
        return res.status(500).json({error: 'something went wrong'})
    }
}



module.exports = { register, login }