const { prisma } = require('../prisma')
/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function listConversation(req, res) {
    try {
        const userId = req.user.id
        const data = await prisma.conversation.findMany({
            where:{ userId: userId},
            select:{
                id: true,
                title: true,
                createdAt: true,
            },
            orderBy:{
                createdAt: "desc"
            }
        })

        res.status(200).json(data)
    } catch (error) {
        res.status(500).json({ error: 'something went wrong'})
    }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function getConversation(req, res) {
    try {
    const id = Number(req.params.id)
        
    if (!Number.isInteger(id)) {
        return res.status(404).json({ error: 'conversation not found'})
    }

    const data = await prisma.conversation.findFirst({
        where:{
            id: id,
            userId: req.user.id
        },
        select:{
            id: true,
            title: true,
            createdAt: true,
            messages:{
                select:{
                    id: true,
                    role: true,
                    content: true,
                    createdAt: true
                },
                orderBy:{
                    createdAt: "asc"
                }
            }
        }
    })

    if (data == null) {
        return res.status(404).json({ error: 'conversation not found'})
    }

    return res.status(200).json(data)
    } catch (error) {
        return res.status(500).json({ error: 'something went wrong'})
    }
}

module.exports = { listConversation, getConversation }