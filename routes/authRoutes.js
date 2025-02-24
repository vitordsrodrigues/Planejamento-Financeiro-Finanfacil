const express = require('express')
const router = express.Router()
const AuthControllers = require('../controllers/AuthControllers')

router.get('/login',AuthControllers.login)
router.post('/login',AuthControllers.loginPost)
router.get('/register',AuthControllers.register)
router.post('/register',AuthControllers.registerPost)
router.get('/logout',AuthControllers.logout)

module.exports = router