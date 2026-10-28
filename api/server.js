require('net').setDefaultAutoSelectFamily(false)

const { setGlobalDispatcher, Agent } = require('undici')
setGlobalDispatcher(new Agent({ connect: { timeout: 30000 } }))
const express = require('express')
const app = express()
const registerRoute = require('./routes/authRoutes')
const helmet = require('helmet')

app.use(helmet())
app.use(express.json())

app.use('/', registerRoute)

const port = 4000

app.listen(port, () => {
    console.log(`app is listening ${port}`)
})

