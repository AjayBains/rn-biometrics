const express = require('express')
require('dotenv').config()
const { MongoClient } = require('mongodb')
const authRoutes = require('./routes/authRoutes')

const app = express()
const port = 3000
const host = '0.0.0.0'

const mongoUrl = process.env.MONGO_URL

if (!mongoUrl) {
  console.error('MONGO_URL environment variable is not set')
  process.exit(1)
}

const client = new MongoClient(mongoUrl)
let server

app.use(express.json())

// minimal request logging
app.use((req, res, next) => {
  const started = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - started
    console.log('[REQ]', req.ip, req.method, req.originalUrl, res.statusCode, `${ms}ms`)
  })
  next()
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use('/auth', authRoutes)

async function start() {
  try {
    await client.connect()
    app.locals.db = client.db()
    server = app.listen(port, host, () => {
      console.log(`Server listening on http://${host}:${port}`)
      console.log('If on a LAN, use your Mac\'s IP, e.g. http://192.168.x.x:3000')
    })
  } catch (err) {
    console.error('Failed to connect to MongoDB', err)
    process.exit(1)
  }
}

start()

const gracefulShutdown = async () => {
  try {
    await client.close()
  } catch (e) {}
  if (server) server.close(() => process.exit(0))
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)
