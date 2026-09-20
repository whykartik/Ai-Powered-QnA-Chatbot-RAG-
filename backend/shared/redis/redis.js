import Redis from "ioredis"

const fallbackStore = new Map()
const fallbackExpiry = new Map()
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 3
})

const getExpiry = (key) => fallbackExpiry.get(key) ?? null

const isExpired = (key) => {
  const expiry = getExpiry(key)
  if (expiry === null) return false
  if (Date.now() > expiry) {
    fallbackStore.delete(key)
    fallbackExpiry.delete(key)
    return true
  }
  return false
}

const fallbackGet = async (key) => {
  if (fallbackStore.has(key) && !isExpired(key)) {
    return fallbackStore.get(key)
  }
  return null
}

const fallbackSet = async (key, value, ...args) => {
  const expiryIndex = args.findIndex((arg) => arg === "EX" || arg === "PX")
  if (expiryIndex !== -1) {
    const expiryValue = Number(args[expiryIndex + 1])
    if (!Number.isNaN(expiryValue)) {
      const ms = args[expiryIndex] === "PX" ? expiryValue : expiryValue * 1000
      fallbackExpiry.set(key, Date.now() + ms)
    }
  } else {
    fallbackExpiry.delete(key)
  }
  fallbackStore.set(key, value)
  return "OK"
}

const fallbackDel = async (key) => {
  fallbackExpiry.delete(key)
  return fallbackStore.delete(key) ? 1 : 0
}

const fallbackIncr = async (key) => {
  const current = Number(await fallbackGet(key) ?? 0)
  const next = current + 1
  await fallbackSet(key, String(next))
  return next
}

const fallbackExpire = async (key, seconds) => {
  const currentValue = await fallbackGet(key)
  if (currentValue === null) return 0
  fallbackExpiry.set(key, Date.now() + Number(seconds) * 1000)
  return 1
}

const fallbackTtl = async (key) => {
  const expiry = getExpiry(key)
  if (expiry === null) return -1
  const remaining = Math.ceil((expiry - Date.now()) / 1000)
  return remaining > 0 ? remaining : -2
}

const originalGet = redis.get.bind(redis)
const originalSet = redis.set.bind(redis)
const originalDel = redis.del.bind(redis)
const originalIncr = redis.incr.bind(redis)
const originalExpire = redis.expire.bind(redis)
const originalTtl = redis.ttl.bind(redis)

redis.get = async (...args) => {
  try {
    return await originalGet(...args)
  } catch (error) {
    return fallbackGet(...args)
  }
}

redis.set = async (...args) => {
  try {
    return await originalSet(...args)
  } catch (error) {
    return fallbackSet(...args)
  }
}

redis.del = async (...args) => {
  try {
    return await originalDel(...args)
  } catch (error) {
    return fallbackDel(...args)
  }
}

redis.incr = async (...args) => {
  try {
    return await originalIncr(...args)
  } catch (error) {
    return fallbackIncr(...args)
  }
}

redis.expire = async (...args) => {
  try {
    return await originalExpire(...args)
  } catch (error) {
    return fallbackExpire(...args)
  }
}

redis.ttl = async (...args) => {
  try {
    return await originalTtl(...args)
  } catch (error) {
    return fallbackTtl(...args)
  }
}

redis.on("connect", () => {
  console.log("redis connected")
})

redis.on("error", (error) => {
  console.warn("Redis unavailable, using in-memory fallback:", error.message)
})

export default redis