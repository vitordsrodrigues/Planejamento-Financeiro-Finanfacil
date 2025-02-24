const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const User = require('./User')



const Despesas = db.define('Despesas', {
    title: {
        type: DataTypes.STRING,
        allowNull:false,
        require:true,
    },
    valor:{
        type:DataTypes.DECIMAL(18,2),
        allowNull:false,
        validate:{
            isDecimal:true,
        }
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            isDate: true,
        },
    },
})

Despesas.belongsTo(User)
User.hasMany(Despesas)

module.exports = Despesas