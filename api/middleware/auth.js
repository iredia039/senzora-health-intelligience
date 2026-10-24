const jwt = require('jsonwebtoken')
    
/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */

async function auth(req, res, next) {
    try {
            const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer')) {
        return res.status(401).json({ error: 'no token available'})
    }
    
    const split = header.split(' ')[1]
    
    const verified = jwt.verify(split, process.env.JWT_SECRET)
    
    // if (!verified) {
    //     return res.status(401).json({ error: 'invalid token'})
    // }
    
    req.user = verified
    next()
    } catch (error) {
        return res.status(401).json({error: 'invalid token'})
    }
}

module.exports = auth