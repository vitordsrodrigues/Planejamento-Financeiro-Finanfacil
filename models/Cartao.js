const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const User = require('./User')



const Cartao = db.define('Cartao', {
    name: {
        type: DataTypes.STRING,
        allowNull:false,
        require:true,
    },
    limite:{
        type:DataTypes.DECIMAL(18,2),
        allowNull:false,
        validate:{
            isDecimal:true,
        }
    },
    dataFechamento: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            isDate: true,
        },
    },
    datavence: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            isDate: true,
        },
    },
    fatura:{
        type:DataTypes.DECIMAL(18,2),
        allowNull:false,
        validate:{
            isDecimal:true,
        }
    },

})

Cartao.belongsTo(User)
User.hasMany(Cartao)
module.exports = Cartao