const health = {
  method: 'GET',
  path: '/health',
  handler: async function (request, h) {
    await request.server.db.authenticate()
    return h.response({ message: 'success' })
  }
}

export { health }
