import { Signer } from '@aws-sdk/rds-signer'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { Client } from 'pg'
import { config } from '../../config.js'

export const postgres = {
  plugin: {
    name: 'postgres',
    version: '1.0.0',
    register: async function (server, options) {
      server.logger.info('Setting up Postgres')

      const db = new Client({
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

      const dbReadOnly = new Client({
        user: options.user,
        password: await getToken(options),
        host: options.hostReadOnly,
        port: options.port,
        database: options.database,
        ...(server.secureContext && {
          ssl: {
            secureContext: server.secureContext
          }
        })
      })

      const databaseName = options.database

      await db.connect()
      server.logger.info(`Postgres connected to ${databaseName}`)

      await dbReadOnly.connect()
      server.logger.info(`Postgres read-only connected to ${databaseName}`)

      server.decorate('server', 'db', db)
      server.decorate('server', 'dbReadOnly', dbReadOnly)

      server.events.on('stop', async () => {
        server.logger.info('Closing Postgres connection')
        await db.end()
        await dbReadOnly.end()
        server.logger.info('Postgres connections closed')
      })
    }
  },
  options: config.get('postgres')
}

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
