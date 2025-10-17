const COLLECTION_NAME = 'users'

async function getUsersCollection(db) {
  const collection = db.collection(COLLECTION_NAME)
  // Ensure unique index on email
  await collection.createIndex({ email: 1 }, { unique: true })
  return collection
}

async function insertUser(db, { email, passwordHash }) {
  const collection = await getUsersCollection(db)
  const now = new Date()
  const result = await collection.insertOne({ email, passwordHash, createdAt: now, updatedAt: now })
  return { _id: result.insertedId, email }
}

async function findUserByEmail(db, email) {
  const collection = await getUsersCollection(db)
  return await collection.findOne({ email })
}

module.exports = {
  getUsersCollection,
  insertUser,
  findUserByEmail
}


