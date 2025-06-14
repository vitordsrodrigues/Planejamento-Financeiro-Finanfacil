const sequelize = require('./conn');
const User = require('../models/User');
const FinancaPessoais = require('../models/FinancaPessoais');
const Despesas = require('../models/Despesas');
const Receitas = require('../models/Receita');
const Cartao = require('../models/Cartao');
const Categorias = require('../models/Categorias');
const CategoriaUsuario = require('../models/CategoriaUsuario');
const Fatura = require('../models/Fatura');
const DespesaCartao = require('../models/DespesaCartao');
const Objetivos = require('../models/Objetivos');

async function migrate() {
    try {
        // Sincroniza todos os modelos com o banco de dados sem forçar a recriação
        await sequelize.sync();
        console.log('Banco de dados sincronizado com sucesso!');
        
        // Verifica se já existem categorias
        const categoriasExistentes = await Categorias.findAll();
        
        if (categoriasExistentes.length === 0) {
            // Só insere as categorias se não existirem
            const categoriasDespesas = [
                'Alimentação', 'Assinatura', 'Casa', 'Compras', 'Educação', 'Lazer',
                'Saúde', 'Serviços', 'Supermercado', 'Transporte', 'Viagem',
                'Operação Bancária', 'Outros'
            ];

            const categoriasReceitas = [
                'Bonificação', 'Empréstimo', 'Investimento', 'Presente', 'Salário',
                'Vendas', 'Renda Extra', 'Outros'
            ];

            for (const name of categoriasDespesas) {
                await Categorias.findOrCreate({ where: { name, tipo: 'despesa' } });
            }

            for (const name of categoriasReceitas) {
                await Categorias.findOrCreate({ where: { name, tipo: 'receita' } });
            }

            console.log('Categorias inseridas com sucesso!');
        } else {
            console.log('Categorias já existem, pulando inserção.');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Erro ao sincronizar o banco de dados:', error);
        process.exit(1);
    }
}

migrate(); 