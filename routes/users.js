const express = require('express')
const router = express.Router()

router.get('/', function (req, res) {
  res.status(200).json([
    { id: 1, name: 'Andrea', role: 'admin', active: true },
    { id: 2, name: 'Luis', role: 'viewer', active: true },
    { id: 3, name: 'Mar', role: 'editor', active: false }
  ])
})

module.exports = router
