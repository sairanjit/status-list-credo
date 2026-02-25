import { serve } from '@hono/node-server'
import { Hono } from 'hono'

let statusListJwt = ''

const app = new Hono()

app.get('/status-list', (c) => {
  if (!statusListJwt) {
    return c.json({ error: 'Status list not found' }, 404)
  }
  return c.text(statusListJwt, 200, { 'Content-Type': 'application/statuslist+jwt' })
})

app.post('/status-list', async (c) => {
  statusListJwt = await c.req.text()
  return c.json({ success: true })
})

serve({
  fetch: app.fetch,
  port: 3000,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
