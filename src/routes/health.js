const health = {
  method: 'GET',
  path: '/health',
  handler: async function (request, h) {
    const dbResult = await request.server.db.query('SELECT 1')
    return h.response({ message: 'success', data: dbResult.rows })
  }
}

export { health }
