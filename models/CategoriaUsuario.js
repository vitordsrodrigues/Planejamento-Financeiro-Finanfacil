const { DataTypes } = require('sequelize');
const db = require('../db/conn');
const Categorias = require('./Categorias');
const User = require('./User');

const CategoriaUsuario = db.define('CategoriaUsuario', {
    UserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',  // Relaciona com a tabela Users
            key: 'id'
        }
    },
    CategoriaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Categorias',  // Relaciona com a tabela Categorias
            key: 'id'
        }
    },
    totalRecebido: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
    },
    totalDespesas: {  // 🔹 Despesas pagas com dinheiro
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
    },
    totalDespesasCartao: {  // 🔹 Despesas pagas com cartão
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['UserId', 'CategoriaId']  // 🔹 Garante que não haja registros duplicados
        }
    ]
});

// Relacionamentos explícitos
CategoriaUsuario.belongsTo(Categorias, { foreignKey: 'CategoriaId' });
CategoriaUsuario.belongsTo(User, { foreignKey: 'UserId' });

module.exports = CategoriaUsuario;
