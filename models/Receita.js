const { DataTypes } = require('sequelize');
const db = require('../db/conn');
const User = require('./User');
const Categorias = require('./Categorias');

const Receita = db.define('Receita', {
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    value: {
        type: DataTypes.DECIMAL(18,2),
        allowNull: false,
        validate: {
            isDecimal: true
        }
    },
    date: {
        type: DataTypes.DATEONLY, // Armazena apenas a data (sem horas)
        allowNull: false,
        validate: {
            isDate: true
        }
    },
    foiProcessada: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    CategoriaId: {  // Definindo explicitamente a coluna da chave estrangeira
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Categorias,
            key: 'id'
        }
    }
});

// Definição das relações entre as tabelas
Receita.belongsTo(User, { foreignKey: 'UserId' });
User.hasMany(Receita, { foreignKey: 'UserId' });

Receita.belongsTo(Categorias, { foreignKey: 'CategoriaId' });  // Receita pertence a uma Categoria
Categorias.hasMany(Receita, { foreignKey: 'CategoriaId' });    // Uma Categoria pode ter várias Receitas

module.exports = Receita;
