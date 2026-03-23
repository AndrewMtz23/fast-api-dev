const express = require('express')
const router = express.Router()

router.get('/', function (req, res) {
  res.status(200).json([
    { id: 1001, customer: 'Andrea', total: 25999, status: 'paid' },
    { id: 1002, customer: 'Luis', total: 899, status: 'pending' },
    { id: 1003, customer: 'Mar', total: 1450, status: 'shipped' }
  ])
})

module.exports = router
