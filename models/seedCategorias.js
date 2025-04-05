const db = require('../db/conn');
const Categorias = require('../models/Categorias');

const categoriasDespesas = [
    'Alimentação', 'Assinatura', 'Casa', 'Compras', 'Educação', 'Lazer',
    'Saúde', 'Serviços', 'Supermercado', 'Transporte', 'Viagem',
    'Operação Bancária', 'Outros'
];

const categoriasReceitas = [
    'Bonificação', 'Empréstimo', 'Investimento', 'Presente', 'Salário',
    'Vendas', 'Renda Extra', 'Outros'
];

async function seedCategorias() {
    await db.sync();
    
    for (const name of categoriasDespesas) {
        await Categorias.findOrCreate({ where: { name, tipo: 'despesa' } });
    }

    for (const name of categoriasReceitas) {
        await Categorias.findOrCreate({ where: { name, tipo: 'receita' } });
    }

    console.log('Categorias inseridas com sucesso!');
    process.exit();
}


seedCategorias();
