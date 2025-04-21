const express = require('express');
const router = express.Router();
const objetivosController = require('../controllers/ObjetivosController');

const checkAuth = require('../helpers/auth').checkAuth

router.get('/viewObjetivos', checkAuth, objetivosController.viewObjetivos);

module.exports = router