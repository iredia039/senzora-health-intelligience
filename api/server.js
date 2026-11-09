require('net').setDefaultAutoSelectFamily(false)

const { setGlobalDispatcher, Agent } = require('undici')
setGlobalDispatcher(new Agent({ connect: { timeout: 30000 } }))

const cors = require('cors')
const express = require('express')
const app = express()
app.set('trust proxy', 1)
const registerRoute = require('./routes/authRoutes')
const helmet = require('helmet')


app.use(cors({
    origin: process.env.WEB_ORIGIN || 'http://localhost:3000'
}))
app.use(helmet())
app.use(express.json())

app.use('/', registerRoute)

const port = process.env.PORT || 4000

app.listen(port, (error) => {
    if (error) {
        console.error(error);
        process.exit(1)
        return
    }
    console.log(`app is listening ${port}`)
})

