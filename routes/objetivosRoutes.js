const express = require('express');
const router = express.Router();
const objetivosController = require('../controllers/ObjetivosController');

const checkAuth = require('../helpers/auth').checkAuth

router.get('/viewObjetivos', checkAuth, objetivosController.viewObjetivos);
router.post('/createObjetivo', checkAuth, objetivosController.createObjetivo);
router.post('/addValor/:id', checkAuth, objetivosController.addValorObjetivo);
router.post('/removeObjetivo/:id', checkAuth, objetivosController.removeObjetivo);
router.post('/updateObjetivo/:id', checkAuth, objetivosController.updateObjetivo);
router.post('/toggleConcluir/:id', checkAuth, objetivosController.toggleConcluirObjetivo);
module.exports = router