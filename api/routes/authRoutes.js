const express = require('express')
const routes = express.Router()
const { register, login, me } = require('../controller/authController')
const facility = require('../controller/facilities')
const auth = require('../middleware/auth')

routes.post('/register', register)
routes.post('/login', login)
routes.get('/me', auth, me)
routes.get('/facilities', facility)

module.exports = routes