const { DataTypes } = require('sequelize');
const db = require('../db/conn');
const User = require('./User');

const Cartao = db.define('Cartao', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    limite_total: {
        type: DataTypes.DECIMAL(18,2),
        allowNull: false,
        validate: {
            isDecimal: true
        }
    },
    limite_disponivel: {
        type: DataTypes.DECIMAL(18,2),
        validate: {
            isDecimal: true
        }
    },
    dataFechamento: {
        type: DataTypes.INTEGER, // Apenas o dia do mês (ex: 10)
        allowNull: false,
        validate: {
            min: 1,
            max: 31
        }
    },
    datavence: {
        type: DataTypes.INTEGER, // Apenas o dia do mês (ex: 20)
        allowNull: false,
        validate: {
            min: 1,
            max: 31
        }
    }
});

// Relacionamento com o usuário (um usuário pode ter vários cartões)
Cartao.belongsTo(User, { foreignKey: 'UserId' });
User.hasMany(Cartao, { foreignKey: 'UserId' });

module.exports = Cartao;
