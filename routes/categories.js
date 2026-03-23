var express = require('express')
var router = express.Router()

router.get('/', function (req, res) {
  res.status(200).json([
    { id: 1, name: 'Computo', featured: true },
    { id: 2, name: 'Accesorios', featured: true },
    { id: 3, name: 'Oficina', featured: false }
  ])
})

module.exports = router
