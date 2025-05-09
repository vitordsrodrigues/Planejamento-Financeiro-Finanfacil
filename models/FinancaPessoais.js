const {DataTypes} = require('sequelize')

const db = require('../db/conn')
const User = require('./User')
const Cartao = require('./Cartao')
const FinancaPessoais = db.define('FinancaPessoais',{
    
    saldo:{
        type:DataTypes.DECIMAL(18,2),
        validate:{
            isDecimal:true,
        }
    },
    totalReceitas:{
        type:DataTypes.DECIMAL(18,2),
        validate:{
            isDecimal:true,
        }
    },
    totalDespesas:{
        type:DataTypes.DECIMAL(18,2),
        validate:{
            isDecimal:true,
        }
    },
    faturat:{
        type:DataTypes.DECIMAL(18,2),
        validate:{
            isDecimal:true,
        }
    },
})

FinancaPessoais.belongsTo(User)
User.hasMany(FinancaPessoais)

module.exports = FinancaPessoais