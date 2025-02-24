const { DataTypes } = require('sequelize')

const db = require('../db/conn')
const User = require('./User')



const Receita = db.define('Receita', {
    title: {
        type: DataTypes.STRING,
        allowNull:false,
        require:true,
    },
    value:{
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

Receita.belongsTo(User)
User.hasMany(Receita)

module.exports = Receita