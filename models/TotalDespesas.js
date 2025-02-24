const {DataTypes} = require('sequelize')

const db = require('../db/conn')
const User = require('./User')
const Despesas = require('./Despesas')

const TotalDespesas = db.define('TotalDespesas',{
    
    total:{
        type:DataTypes.DECIMAL(18,2),
        allowNull:false,
        validate:{
            isDecimal:true,
        }
    },
})

TotalDespesas.belongsTo(User)
User.hasMany(TotalDespesas)

module.exports = TotalDespesas