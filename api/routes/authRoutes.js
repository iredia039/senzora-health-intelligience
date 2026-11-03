const express = require('express')
const routes = express.Router()
const { register, login, me } = require('../controller/authController')
const facility = require('../controller/facilities')
const chatbot = require('../controller/chatbot')
const { listConversation, getConversation } = require('../controller/conversation')
const auth = require('../middleware/auth')

routes.post('/register', register)
routes.post('/login', login)
routes.get('/me', auth, me)
routes.post('/chatbot', auth, chatbot)
routes.get('/conversations', auth, listConversation)
routes.get('/conversations/:id', auth, getConversation)
routes.get('/facilities', facility)

module.exports = routes