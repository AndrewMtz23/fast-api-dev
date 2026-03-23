var express = require('express')
var router = express.Router()

router.get('/', function (req, res) {
  res.status(200).json({
    totalUsers: 3,
    totalItems: 2,
    totalOrders: 3,
    environment: 'demo'
  })
})

module.exports = router
