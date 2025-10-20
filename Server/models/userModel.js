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
  const result = await collection.insertOne({
    email,
    passwordHash,
    biometricDevices: [],
    createdAt: now,
    updatedAt: now,
  })
  return { _id: result.insertedId, email }
}

async function findUserByEmail(db, email) {
  const collection = await getUsersCollection(db)
  return await collection.findOne({ email })
}

async function addBiometricDevice(db, userId, device) {
  const collection = await getUsersCollection(db)
  const now = new Date()
  await collection.updateOne(
    { _id: userId },
    {
      $push: { biometricDevices: { ...device, createdAt: now, updatedAt: now } },
      $set: { updatedAt: now },
    }
  )
}

async function findUserByDeviceKeyId(db, deviceKeyId) {
  const collection = await getUsersCollection(db)
  return await collection.findOne({ 'biometricDevices.deviceKeyId': deviceKeyId })
}

async function setDeviceChallenge(db, deviceKeyId, challenge, expiresAt) {
  const collection = await getUsersCollection(db)
  const now = new Date()
  await collection.updateOne(
    { 'biometricDevices.deviceKeyId': deviceKeyId },
    {
      $set: {
        'biometricDevices.$.pendingChallenge': { challenge, expiresAt },
        'biometricDevices.$.updatedAt': now,
        updatedAt: now,
      },
    }
  )
}

async function consumeDeviceChallenge(db, deviceKeyId) {
  const collection = await getUsersCollection(db)
  const now = new Date()
  await collection.updateOne(
    { 'biometricDevices.deviceKeyId': deviceKeyId },
    {
      $unset: { 'biometricDevices.$.pendingChallenge': '' },
      $set: { 'biometricDevices.$.lastUsedAt': now, 'biometricDevices.$.updatedAt': now, updatedAt: now },
    }
  )
}

module.exports = {
  getUsersCollection,
  insertUser,
  findUserByEmail
  , addBiometricDevice
  , findUserByDeviceKeyId
  , setDeviceChallenge
  , consumeDeviceChallenge
}


