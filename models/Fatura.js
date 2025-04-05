const { DataTypes } = require('sequelize');
const db = require('../db/conn');
const Cartao = require('./Cartao');

const Fatura = db.define('Fatura', {
    mes: {
        type: DataTypes.INTEGER, // Exemplo: 1 = Janeiro, 2 = Fevereiro...
        allowNull: false,
        validate: {
            min: 1,
            max: 12
        }
    },
    ano: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: true
        }
    },
    valor_total: {
        type: DataTypes.DECIMAL(18,2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            isDecimal: true
        }
    },
    status: {
        type: DataTypes.ENUM('Aberta','Fechada','Paga'),
        allowNull: false,
        defaultValue: 'Aberta'
    }
});

// Relacionamento: Uma fatura pertence a um cartão
Fatura.belongsTo(Cartao, { foreignKey: 'CartaoId' });
Cartao.hasMany(Fatura, { foreignKey: 'CartaoId' });

module.exports = Fatura;
