const {DataTypes} = require('sequelize')

const db = require('../db/conn')
const User = require('./User')

const Objetivos = db.define('Objetivos',{
    
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    valor_objeto:{
        type:DataTypes.DECIMAL(18,2),
        allowNull:false,
        validate:{
            isDecimal:true,
        }
    },
    valor_guardado:{
        type:DataTypes.DECIMAL(18,2),
        allowNull:false,
        validate:{
            isDecimal:true,
        }
    },
   
})

Objetivos.belongsTo(User)
User.hasMany(Objetivos)

module.exports = Objetivos