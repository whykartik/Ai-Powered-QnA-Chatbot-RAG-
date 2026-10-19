import Redis from "ioredis"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fallbackFile = path.join(__dirname, ".fallback-redis.json")

const loadFallback = () => {
  try {
    if (fs.existsSync(fallbackFile)) {
      const data = JSON.parse(fs.readFileSync(fallbackFile, "utf-8"))
      return {
        store: new Map(Object.entries(data.store || {})),
        expiry: new Map(Object.entries(data.expiry || {}))
      }
    }
  } catch (e) {}
  return { store: new Map(), expiry: new Map() }
}

const saveFallback = (store, expiry) => {
  try {
    const data = {
      store: Object.fromEntries(store),
      expiry: Object.fromEntries(expiry)
    }
    fs.writeFileSync(fallbackFile, JSON.stringify(data), "utf-8")
  } catch (e) {}
}

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null
})

const isExpired = (key, expiryMap, storeMap) => {
  const expiry = expiryMap.get(key)
  if (expiry === undefined || expiry === null) return false
  if (Date.now() > Number(expiry)) {
    storeMap.delete(key)
    expiryMap.delete(key)
    return true
  }
  return false
}

const fallbackGet = async (key) => {
  const { store, expiry } = loadFallback()
  if (store.has(key) && !isExpired(key, expiry, store)) {
    return store.get(key)
  }
  return null
}

const fallbackSet = async (key, value, ...args) => {
  const { store, expiry } = loadFallback()
  const expiryIndex = args.findIndex((arg) => arg === "EX" || arg === "PX")
  if (expiryIndex !== -1) {
    const expiryValue = Number(args[expiryIndex + 1])
    if (!Number.isNaN(expiryValue)) {
      const ms = args[expiryIndex] === "PX" ? expiryValue : expiryValue * 1000
      expiry.set(key, Date.now() + ms)
    }
  } else {
    expiry.delete(key)
  }
  store.set(key, value)
  saveFallback(store, expiry)
  return "OK"
}

const fallbackDel = async (key) => {
  const { store, expiry } = loadFallback()
  expiry.delete(key)
  const deleted = store.delete(key)
  saveFallback(store, expiry)
  return deleted ? 1 : 0
}

const fallbackIncr = async (key) => {
  const current = Number(await fallbackGet(key) ?? 0)
  const next = current + 1
  await fallbackSet(key, String(next))
  return next
}

const fallbackExpire = async (key, seconds) => {
  const { store, expiry } = loadFallback()
  const currentValue = store.get(key)
  if (!currentValue) return 0
  expiry.set(key, Date.now() + Number(seconds) * 1000)
  saveFallback(store, expiry)
  return 1
}

const fallbackTtl = async (key) => {
  const { store, expiry } = loadFallback()
  if (!store.has(key)) return -2
  const exp = expiry.get(key)
  if (!exp) return -1
  const remaining = Math.ceil((Number(exp) - Date.now()) / 1000)
  return remaining > 0 ? remaining : -2
}

const fallbackExists = async (key) => {
  const val = await fallbackGet(key)
  return val !== null ? 1 : 0
}

const originalGet = redis.get.bind(redis)
const originalSet = redis.set.bind(redis)
const originalDel = redis.del.bind(redis)
const originalIncr = redis.incr.bind(redis)
const originalExpire = redis.expire.bind(redis)
const originalTtl = redis.ttl.bind(redis)
const originalExists = redis.exists.bind(redis)

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

redis.exists = async (...args) => {
  try {
    return await originalExists(...args)
  } catch (error) {
    return fallbackExists(...args)
  }
}

redis.on("connect", () => {
  console.log("redis connected")
})

redis.on("error", (error) => {
  // Graceful fallback
})

export default redis