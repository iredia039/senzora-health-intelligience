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

module.exports = { listConversation }