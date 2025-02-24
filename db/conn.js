const {Sequelize} = require('sequelize')

const sequelize = new Sequelize('financas','root','',{
    host:'localhost',
    dialect:'mysql',
})

try{
    sequelize.authenticate()
    console.log('conectamos com sucesso')
}catch(err){
    console.log(`não epossivel conectar:${err}`)
}

module.exports = sequelize