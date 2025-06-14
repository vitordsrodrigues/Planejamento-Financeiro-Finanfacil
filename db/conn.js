const {Sequelize} = require('sequelize')

const sequelize = new Sequelize('postgresql://financas_owner:npg_Vej4hNsgR6Qd@ep-white-cell-a85bnok0-pooler.eastus2.azure.neon.tech/financas?sslmode=require', {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
})

try{
    sequelize.authenticate()
    console.log('conectamos com sucesso')
}catch(err){
    console.log(`não epossivel conectar:${err}`)
}

module.exports = sequelize