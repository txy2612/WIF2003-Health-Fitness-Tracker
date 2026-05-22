import dns from 'node:dns'
import net from 'node:net'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })

//load .env silently
const uri = process.env.MONGODB_URI //loads MONGODB_URI from .env
const fallbackDnsServers = process.env.MONGODB_DNS_SERVERS || '1.1.1.1,8.8.8.8' // dns is used to look up MongoDB records

//prints MongoDB URI safely by hiding username/password
function maskMongoUri(value) {
  if (!value) return '<missing>'
  return value.replace(/:\/\/([^:]+):([^@]+)@/, '://<user>:<password>@')
}

//wrap async with timeout
function withTimeout(promise, ms, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function resolveSrv(hostname) {
  return new Promise((resolve, reject) => {
    dns.resolveSrv(`_mongodb._tcp.${hostname}`, (error, records) => {
      if (error) reject(error)
      else resolve(records)
    })
  })
}

function resolveTxt(hostname) {
  return new Promise((resolve, reject) => {
    dns.resolveTxt(hostname, (error, records) => {
      if (error) reject(error)
      else resolve(records)
    })
  })
}

function testTcp(host, port, ms = 5000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })

    const finish = (result) => {
      socket.destroy()
      resolve(result)
    }

    socket.setTimeout(ms)
    socket.once('connect', () => finish({ ok: true }))
    socket.once('timeout', () => finish({ ok: false, error: 'timeout' }))
    socket.once('error', (error) => finish({ ok: false, error: error.message }))
  })
}

async function main() {
  // prints URI w/o exposing credentials
  console.log('MongoDB URI:', maskMongoUri(uri))

  if (!uri) {
    console.error('MONGODB_URI is missing from .env')
    process.exitCode = 1
    return
  }

  const parsed = new URL(uri)
  const hostname = parsed.hostname
  const initialDnsServers = dns.getServers()
  const usesLocalhostDns = initialDnsServers.some((server) => server === '127.0.0.1' || server === '::1')

  if (usesLocalhostDns) {
    const servers = fallbackDnsServers
      .split(',')
      .map((server) => server.trim())
      .filter(Boolean)

    if (servers.length > 0) dns.setServers(servers)
  }

  console.log('Node:', process.version)
  console.log('Initial Node DNS servers:', initialDnsServers.join(', ') || '<none>')
  console.log('Active Node DNS servers:', dns.getServers().join(', ') || '<none>')
  console.log('MongoDB host:', hostname)

  let srvRecords = []

  console.log('\n1. DNS SRV lookup')
  try {
    srvRecords = await withTimeout(resolveSrv(hostname), 10000, 'SRV lookup')
    for (const record of srvRecords) {
      console.log(`OK ${record.name}:${record.port}`)
    }
  } catch (error) {
    console.error(`FAIL ${error.code || error.name}: ${error.message}`)
  }

  console.log('\n2. DNS TXT lookup')
  try {
    const txtRecords = await withTimeout(resolveTxt(hostname), 10000, 'TXT lookup')
    console.log('OK', JSON.stringify(txtRecords))
  } catch (error) {
    console.error(`FAIL ${error.code || error.name}: ${error.message}`)
  }

  console.log('\n3. TCP checks')
  if (srvRecords.length === 0) {
    console.log('SKIP no SRV records available')
  } else {
    for (const record of srvRecords) {
      const result = await testTcp(record.name, record.port)
      console.log(`${result.ok ? 'OK' : 'FAIL'} ${record.name}:${record.port}${result.error ? ` - ${result.error}` : ''}`)
    }
  }

  console.log('\n4. Mongoose connection')
  if (parsed.protocol === 'mongodb+srv:' && srvRecords.length === 0) {
    console.log('SKIP mongodb+srv requires a working DNS SRV lookup first')
    process.exitCode = 1
    return
  }

  try {
    await withTimeout(
      mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 }),
      15000,
      'Mongoose connection',
    )
    console.log('OK connected')
    await mongoose.disconnect()
  } catch (error) {
    console.error(`FAIL ${error.name}: ${error.message}`)
    process.exitCode = 1
  }
}

await main()
process.exit(process.exitCode || 0)
