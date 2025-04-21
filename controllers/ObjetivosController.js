
const User = require('../models/User')
const objetivosRoutes = require('../routes/objetivosRoutes')

module.exports = class objetivosController{

    static async viewObjetivos(req, res){
        res.render('financas/viewObjetivos')
    }
}