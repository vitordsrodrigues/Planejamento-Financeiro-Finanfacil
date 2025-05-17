const express = require('express')
const router = express.Router()
const FinancasControllers = require('../controllers/FinancasControllers')
const checkAuth = require('../helpers/auth').checkAuth

//visualizar as view
router.get('/viewReceitas',checkAuth,FinancasControllers.viewReceitas)
router.get('/viewDespesas',checkAuth,FinancasControllers.viewDespesas)
router.get('/viewCartaos',checkAuth,FinancasControllers.viewCartaos)
router.get('/saldo',checkAuth,FinancasControllers.viewSaldo)


//salvar no banco
router.post('/despesa',checkAuth,FinancasControllers.createDespesaSave)
router.post('/receita',checkAuth,FinancasControllers.createReceitaSave)
router.post('/cartao',checkAuth,FinancasControllers.createCartaoSave)


//renderizar home e dashboard
router.get('/dashboard',checkAuth,FinancasControllers.dashboard)
router.get('/',FinancasControllers.showMain)

//excluindo
router.post('/removeItem', FinancasControllers.removeItem);

//editar
router.post('/updateItem', FinancasControllers.updateItem);
router.post('/editc/',checkAuth,FinancasControllers.updateCartaoSave)

module.exports = router