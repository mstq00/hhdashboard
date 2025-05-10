import { Hono } from 'hono'
import { jwt } from 'hono/jwt'

const app = new Hono()

// JWT 미들웨어 설정
app.use('/api/*', jwt({
  secret: 'hejdoohome2023!'
}))

// 상품 매핑 API
app.get('/api/product-mappings', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM product_mappings'
  ).all()
  return c.json(results)
})

app.post('/api/product-mappings', async (c) => {
  const { original_product, original_option, mapped_product, mapped_option, price, cost } = await c.req.json()
  const { success } = await c.env.DB.prepare(
    'INSERT INTO product_mappings (original_product, original_option, mapped_product, mapped_option, price, cost) VALUES (?, ?, ?, ?, ?, ?)'
  )
  .bind(original_product, original_option, mapped_product, mapped_option, price, cost)
  .run()

  if (success) {
    return c.json({ message: 'Mapping added successfully' }, 201)
  }
  return c.json({ message: 'Failed to add mapping' }, 500)
})

// 만다라트 차트 API
app.get('/api/mandala', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM mandala'
  ).all()
  return c.json(results)
})

app.post('/api/mandala', async (c) => {
  const { cell_id, content, completed } = await c.req.json()
  const { success } = await c.env.DB.prepare(
    'INSERT OR REPLACE INTO mandala (cell_id, content, completed) VALUES (?, ?, ?)'
  )
  .bind(cell_id, content, completed)
  .run()

  if (success) {
    return c.json({ message: 'Mandala cell updated successfully' }, 201)
  }
  return c.json({ message: 'Failed to update mandala cell' }, 500)
})

// 추가 정보 API
app.get('/api/info', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM info'
  ).all()
  return c.json(results)
})

app.post('/api/info', async (c) => {
  const { key, value } = await c.req.json()
  const { success } = await c.env.DB.prepare(
    'INSERT OR REPLACE INTO info (key, value) VALUES (?, ?)'
  )
  .bind(key, value)
  .run()

  if (success) {
    return c.json({ message: 'Info updated successfully' }, 201)
  }
  return c.json({ message: 'Failed to update info' }, 500)
})

// 관리자 로그인 API
app.post('/login', async (c) => {
  const { username, password } = await c.req.json()
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM admins WHERE username = ? AND password = ?'
  )
  .bind(username, password)
  .all()

  if (results.length > 0) {
    const token = await jwt.sign({ username }, 'hejdoohome2023!')
    return c.json({ token })
  }
  return c.json({ message: 'Invalid credentials' }, 401)
})

export default app