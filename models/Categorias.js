const { DataTypes } = require('sequelize');
const db = require('../db/conn');

const Categorias = db.define('Categorias', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    tipo: {
        type: DataTypes.ENUM('despesa', 'receita'),
        allowNull: false,
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['name', 'tipo'] // Garante que "name" pode se repetir, mas não a mesma combinação de "name" e "tipo"
        }
    ]
});

module.exports = Categorias;
