const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')

const indexRouter = require('../routes/index')
const usersRouter = require('../routes/users')
const itemsRouter = require('../routes/items')
const categoriesRouter = require('../routes/categories')
const ordersRouter = require('../routes/orders')
const metricsRouter = require('../routes/metrics')

const app = express()

app.disable('x-powered-by')
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, '../public')))

app.use('/', indexRouter)
app.use('/users', usersRouter)
app.use('/items', itemsRouter)
app.use('/categories', categoriesRouter)
app.use('/orders', ordersRouter)
app.use('/metrics', metricsRouter)

module.exports = app
