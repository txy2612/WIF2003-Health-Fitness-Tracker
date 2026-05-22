import mongoose from 'mongoose'
import dns from 'node:dns'
import env from './env.js'

function configureMongoDns() {
  const dnsServers = dns.getServers()
  const usesLocalhostDns = dnsServers.some((server) => server === '127.0.0.1' || server === '::1')

  if (!usesLocalhostDns) return

  const fallbackServers = env.MONGODB_DNS_SERVERS
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean)

  if (fallbackServers.length === 0) return

  dns.setServers(fallbackServers)
  console.log(`Node DNS changed for MongoDB SRV lookup: ${fallbackServers.join(', ')}`)
}

export default async function connectDatabase() {
  try {
    configureMongoDns()

    // connect backend to MongoDB
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    })

    console.log('MongoDB connected')
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    process.exit(1)//stop backend if database failed, bcz db allow CRUD & is used ewhere in the backend. If db fail, app bcmz unreliable
  }
}
