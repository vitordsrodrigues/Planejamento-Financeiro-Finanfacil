
const FinancaPessoais = require('../models/FinancaPessoais'); // Ajuste o caminho conforme necessário

const atualizarSaldo = async (userId, valor, tipo) => {
    try {
        let financas = await FinancaPessoais.findOne({ where: { UserId: userId } });

        if (!financas) {
            financas = await FinancaPessoais.create({
                UserId: userId,
                saldo: 0,
                totalReceitas: 0,
                totalDespesas: 0
            });
        }

        // Garantir que os valores são números
        financas.saldo = parseFloat(financas.saldo) || 0;
        financas.totalReceitas = parseFloat(financas.totalReceitas) || 0;
        financas.totalDespesas = parseFloat(financas.totalDespesas) || 0;

        valor = parseFloat(valor); // Converte o valor recebido para número

        if (tipo === 'receita') {
            financas.saldo += valor; // Adiciona o valor ao saldo
            financas.totalReceitas += valor; // Atualiza o total de receitas
        } else if (tipo === 'despesa') {
            financas.saldo -= valor; // Subtrai o valor do saldo
            financas.totalDespesas += valor; // Atualiza o total de despesas
        } else {
            throw new Error('Tipo inválido. Use "receita" ou "despesa".');
        }

        await financas.save();
        console.log(`Saldo atualizado com sucesso. Novo saldo: ${financas.saldo}`);
    } catch (error) {
        console.error('Erro ao atualizar saldo:', error);
        throw new Error('Erro ao atualizar saldo.');
    }
};

module.exports = atualizarSaldo;