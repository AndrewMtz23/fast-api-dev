const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const client = require('prom-client')

const indexRouter = require('../routes/index')
const usersRouter = require('../routes/users')
const itemsRouter = require('../routes/items')
const categoriesRouter = require('../routes/categories')
const ordersRouter = require('../routes/orders')
const metricsRouter = require('../routes/metrics')

const app = express() 
const activeRequests = new client.Gauge({
  name: 'active_users_current',
  help: 'Numero actual de usuarios activos simulados'
})
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de peticiones HTTP procesadas',
  labelNames: ['metodo', 'ruta', 'estado_http']
})

app.disable('x-powered-by')
client.collectDefaultMetrics()

app.use(logger('dev'))
app.use((req, res, next) => {
  activeRequests.inc()

  res.on('finish', () => {
    httpRequestCounter.inc({
      metodo: req.method,
      ruta: req.route ? req.route.path : req.path,
      estado_http: String(res.statusCode)
    })
    activeRequests.dec()
  })

  next()
})
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, '../public')))

app.get('/monitoring/metrics', async function (req, res) {
  res.set('Content-Type', client.register.contentType)
  res.send(await client.register.metrics())
})

app.use('/', indexRouter)
app.use('/users', usersRouter)
app.use('/items', itemsRouter)
app.use('/categories', categoriesRouter)
app.use('/orders', ordersRouter)
app.use('/metrics', metricsRouter)

module.exports = app
