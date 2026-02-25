var express = require('express')
var router = express.Router()

router.get('/', (req, res) => {
  res.status(200).json([
    { id: 1, name: 'Laptop', stock: 10 },
    { id: 2, name: 'Mouse', stock: 50 }
  ])
})

module.exports = router
