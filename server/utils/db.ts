import mongoose from 'mongoose'

export async function ensureConnection() {
  if (mongoose.connection.readyState !== 1) {
    const config = useRuntimeConfig()
    await mongoose.connect(config.mongodbUri)
  }
}

export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id)
}

export function toObjectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id)
}
