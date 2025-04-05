const express = require('express');
const router = express.Router();
const FaturaController = require('../controllers/FaturasControllers');
const checkAuth = require('../helpers/auth').checkAuth

router.post('/pagar/:id', FaturaController.pagarFatura);
router.post('/addd',checkAuth,FaturaController.addDespesaCartao)

module.exports = router;
