const {DataTypes} = require('sequelize')

const db = require('../db/conn')
const User = require('./User')

const Objetivos = db.define('Objetivos', {
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    valor_objeto: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        validate: {
            isDecimal: true
        }
    },
    valor_guardado: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        validate: {
            isDecimal: true
        }
    },
    deposito_mensal: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
        defaultValue: 0
    },
    concluido: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false // Por padrão, o objetivo não está concluído
    },
    UserId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

Objetivos.belongsTo(User)
User.hasMany(Objetivos)

module.exports = Objetivos