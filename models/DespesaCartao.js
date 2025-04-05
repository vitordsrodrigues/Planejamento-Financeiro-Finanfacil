const { DataTypes } = require('sequelize');
const db = require('../db/conn');
const Fatura = require('./Fatura');
const Categorias = require('./Categorias');

const DespesaCartao = db.define('DespesaCartao', {
    descricao: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    valor: {
        type: DataTypes.DECIMAL(18,2),
        allowNull: false,
        validate: {
            isDecimal: true
        }
    },
    data_compra: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            isDate: true
        }
    }
});

// Relacionamento: A despesa pertence a uma fatura
DespesaCartao.belongsTo(Fatura, { foreignKey: 'FaturaId' });
Fatura.hasMany(DespesaCartao, { foreignKey: 'FaturaId' });

// Relacionamento: A despesa pertence a uma categoria
DespesaCartao.belongsTo(Categorias, { foreignKey: 'CategoriaId' });
Categorias.hasMany(DespesaCartao, { foreignKey: 'CategoriaId' });

module.exports = DespesaCartao;
