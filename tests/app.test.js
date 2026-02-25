const request = require('supertest')
const app = require('../src/app')
const { calculateValue, isInStock } = require('../src/logic')

describe('Suite de Pruebas de Calidad de Software', () => {

  describe('Pruebas Unitarias - Lógica de Inventario', () => {
    // Ba 1
    test('Debe calcular correctamente el valor total (10 * 5 = 50)', () => {
      const result = calculateValue(10, 5)
      expect(result).toBe(50)
    })

    // Ba 2
    test('Debe retornar 0 si se ingresan valores negativos', () => {
      const result = calculateValue(-10, 5)
      expect(result).toBe(0)
    })

    // Ex - Jest
    test('Debe retornar 0 si el stock es 0', () => {
      const result = calculateValue(10, 0)
      expect(result).toBe(0)
    })

    // Ex - Jest
    test('Debe retornar true si hay stock disponible', () => {
      const result = isInStock(5)
      expect(result).toBe(true)
    })
  })

  describe('Pruebas de Integración - API Endpoints', () => {
    // Ba 1
    test('GET /health - Debe responder con status 200 y JSON correcto', async () => {
      const response = await request(app).get('/health')
      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveProperty('status', 'OK')
    })

    // Ba 2
    test('GET /items - Debe validar la estructura del inventario', async () => {
      const response = await request(app).get('/items')
      expect(response.statusCode).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body[0]).toHaveProperty('id')
      expect(response.body[0]).toHaveProperty('stock')
    })

    // Ex 1 - Supertest
    test('GET /items - Debe contener al menos un item en el inventario', async () => {
      const response = await request(app).get('/items')
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBeGreaterThan(0)
    })

    // Ex 2 - Supertest
    test('GET /health - Debe contener la propiedad uptime', async () => {
      const response = await request(app).get('/health')
      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveProperty('uptime')
    })
  })

})