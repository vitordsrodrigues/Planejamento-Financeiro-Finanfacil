const Receita = require('../models/Receita');
const Despesas = require('../models/Despesas');
const atualizarSaldo = require('./atualizarSaldo');
const { Op, literal } = require('sequelize');

const processarPendentes = async (userId) => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1; // Meses começam em 0, então adicionamos 1
    const anoAtual = hoje.getFullYear();

    console.log('Processando receitas e despesas pendentes para o mês atual...');

    try {
        // Processar receitas pendentes
        const receitasPendentes = await Receita.findAll({
            where: {
                foiProcessada: false,
                [Op.and]: [
                    literal(`EXTRACT(YEAR FROM "date") <= ${anoAtual} AND EXTRACT(MONTH FROM "date") <= ${mesAtual}`)
                ],
                UserId: userId
            }
        });

        for (const receita of receitasPendentes) {
            console.log(`Processando receita: ${receita.title}, valor: ${receita.value}`);
            await atualizarSaldo(receita.UserId, receita.value, 'receita');
            receita.foiProcessada = true;
            await receita.save();
        }

        // Processar despesas pendentes
        const despesasPendentes = await Despesas.findAll({
            where: {
                foiProcessada: false,
                [Op.and]: [
                    literal(`EXTRACT(YEAR FROM "date") <= ${anoAtual} AND EXTRACT(MONTH FROM "date") <= ${mesAtual}`)
                ],
                UserId: userId
            }
        });

        for (const despesa of despesasPendentes) {
            console.log(`Processando despesa: ${despesa.title}, valor: ${despesa.valor}`);
            await atualizarSaldo(despesa.UserId, despesa.valor, 'despesa');
            despesa.foiProcessada = true;
            await despesa.save();
        }

        console.log('Receitas e despesas pendentes processadas com sucesso.');
    } catch (error) {
        console.error('Erro ao processar receitas e despesas pendentes:', error);
    }
};

module.exports = processarPendentes;