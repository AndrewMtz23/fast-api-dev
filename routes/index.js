const express = require('express')
const router = express.Router()

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() })
})

module.exports = router
