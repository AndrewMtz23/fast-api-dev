const request = require('supertest')
const app = require('../src/app')
const { calculateValue, isInStock } = require('../src/logic')

describe('Suite de Pruebas de Calidad de Software', () => {
  describe('Pruebas Unitarias - Logica de Inventario', () => {
    test('Debe calcular correctamente el valor total (10 * 5 = 50)', () => {
      const result = calculateValue(10, 5)
      expect(result).toBe(50)
    })

    test('Debe retornar 0 si se ingresan valores negativos', () => {
      const result = calculateValue(-10, 5)
      expect(result).toBe(0)
    })

    test('Debe retornar 0 si el stock es 0', () => {
      const result = calculateValue(10, 0)
      expect(result).toBe(0)
    })

    test('Debe retornar true si hay stock disponible', () => {
      const result = isInStock(5)
      expect(result).toBe(true)
    })
  })

  describe('Pruebas de Integracion - API Endpoints', () => {
    test('GET /health - Debe responder con status 200 y JSON correcto', async () => {
      const response = await request(app).get('/health')
      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveProperty('status', 'OK')
    })

    test('GET /items - Debe validar la estructura del inventario', async () => {
      const response = await request(app).get('/items')
      expect(response.statusCode).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body[0]).toHaveProperty('id')
      expect(response.body[0]).toHaveProperty('stock')
    })

    test('GET /items - Debe contener al menos un item en el inventario', async () => {
      const response = await request(app).get('/items')
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBeGreaterThan(0)
    })

    test('GET /health - Debe contener la propiedad uptime', async () => {
      const response = await request(app).get('/health')
      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveProperty('uptime')
    })

    test('GET /users - Debe responder con usuarios estaticos', async () => {
      const response = await request(app).get('/users')
      expect(response.statusCode).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body[0]).toHaveProperty('id')
      expect(response.body[0]).toHaveProperty('role')
      expect(response.body[0]).toHaveProperty('active')
    })

    test('GET /categories - Debe responder con categorias estaticas', async () => {
      const response = await request(app).get('/categories')
      expect(response.statusCode).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body[0]).toHaveProperty('name')
      expect(response.body[0]).toHaveProperty('featured')
    })

    test('GET /orders - Debe responder con ordenes estaticas', async () => {
      const response = await request(app).get('/orders')
      expect(response.statusCode).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body[0]).toHaveProperty('customer')
      expect(response.body[0]).toHaveProperty('status')
      expect(response.body[0]).toHaveProperty('total')
    })

    test('GET /metrics - Debe responder con metricas estaticas', async () => {
      const response = await request(app).get('/metrics')
      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveProperty('totalUsers')
      expect(response.body).toHaveProperty('totalItems')
      expect(response.body).toHaveProperty('totalOrders')
      expect(response.body).toHaveProperty('environment', 'demo')
    })
  })
})
