import { db } from '../data/index.js'

const health = {
  method: 'GET',
  path: '/health',
  handler: async function (_request, h) {
    const dbResult = await db.query('SELECT 1')
    return h.response({ message: 'success', data: dbResult.rows })
  }
}

export { health }
