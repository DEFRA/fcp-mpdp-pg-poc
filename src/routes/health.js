const health = {
  method: 'GET',
  path: '/health',
  handler: async function (request, h) {
    try {
      await request.server.db.authenticate()
      return h.response({ message: 'success' })
    } catch (error) {
      request.server.logger.error(error)
      return h.response({ message: 'failure' }).code(500)
    }
  }
}

export { health }
