const express = require('express')
const router = express.Router()
const AuthControllers = require('../controllers/AuthControllers')

console.log('Rotas de autenticação carregadas')

router.get('/login',AuthControllers.login)
router.post('/login', (req, res, next) => {
    console.log('Requisição POST para /login capturada')
    console.log('Body:', req.body)
    next()
}, AuthControllers.loginPost)
router.get('/register',AuthControllers.register)
router.post('/register',AuthControllers.registerPost)
router.get('/logout',AuthControllers.logout)

module.exports = router