import { Signer } from '@aws-sdk/rds-signer'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { Client } from 'pg'
import { config } from '../config.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const options = config.get('postgres')

const logger = createLogger()

let db

async function getToken(options) {
  if (options.getTokenFromRDS) {
    const signer = new Signer({
      hostname: options.host,
      port: options.port,
      username: options.user,
      credentials: fromNodeProviderChain(),
      region: options.region
    })
    return await signer.getAuthToken()
  } else {
    return options.passwordForLocalDev
  }
}

async function connectToPostgres(server) {
  db = new Client({
    user: options.user,
    password: await getToken(options),
    host: options.host,
    port: options.port,
    database: options.database,
    ...(server.secureContext && {
      ssl: {
        secureContext: server.secureContext
      }
    })
  })
  await db.connect()
  logger.info('Connected to Postgres')
}

export { connectToPostgres, db }
