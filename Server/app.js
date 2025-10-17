const express = require('express')
require('dotenv').config()
const { MongoClient } = require('mongodb')
const authRoutes = require('./routes/authRoutes')

const app = express()
const port = 3000

const mongoUrl = process.env.MONGO_URL

if (!mongoUrl) {
  console.error('MONGO_URL environment variable is not set')
  process.exit(1)
}

const client = new MongoClient(mongoUrl)
let server

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use('/auth', authRoutes)

async function start() {
  try {
    await client.connect()
    app.locals.db = client.db()
    server = app.listen(port, () => {
      console.log(`Example app listening on port ${port}`)
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
