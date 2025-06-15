const Despesas = require('../models/Despesas');
const Cartao = require('../models/Cartao');
const DespesaCartao = require('../models/DespesaCartao');
const Fatura = require('../models/Fatura');
const Receita = require('../models/Receita');
const { Op, fn, col, where: sequelizeWhere, literal } = require('sequelize');

async function calcularSaldoPorMes(userId, ano, mes) {
    const receitasAnteriores = await Receita.findAll({
        where: {
            UserId: userId,
            [Op.or]: [
                { [Op.and]: [literal(`EXTRACT(YEAR FROM "date") < ${ano}`)] },
                {
                    [Op.and]: [
                        literal(`EXTRACT(YEAR FROM "date") = ${ano}`),
                        literal(`EXTRACT(MONTH FROM "date") < ${mes}`)
                    ]
                }
            ]
        },
        raw: true
    });
    const totalReceitasAnteriores = receitasAnteriores.reduce((acc, r) => acc + parseFloat(r.value || 0), 0);

    const despesasAnteriores = await Despesas.findAll({
        where: {
            UserId: userId,
            [Op.or]: [
                { [Op.and]: [literal(`EXTRACT(YEAR FROM "date") < ${ano}`)] },
                {
                    [Op.and]: [
                        literal(`EXTRACT(YEAR FROM "date") = ${ano}`),
                        literal(`EXTRACT(MONTH FROM "date") < ${mes}`)
                    ]
                }
            ]
        },
        raw: true
    });
    const totalDespesasAnteriores = despesasAnteriores.reduce((acc, d) => acc + parseFloat(d.valor || 0), 0);

    const cartoes = await Cartao.findAll({ where: { UserId: userId }, raw: true });
    const cartaoIds = cartoes.map(c => c.id);

    const faturasAnteriores = await Fatura.findAll({
        where: {
            CartaoId: { [Op.in]: cartaoIds },
            [Op.or]: [
                { [Op.and]: [{ ano: { [Op.lt]: ano } }] },
                {
                    [Op.and]: [
                        { ano: ano },
                        { mes: { [Op.lt]: mes } }
                    ]
                }
            ]
        },
        raw: true
    });
    const faturaIdsAnteriores = faturasAnteriores.map(f => f.id);

    const despesasCartaoAnteriores = await DespesaCartao.findAll({
        where: {
            FaturaId: { [Op.in]: faturaIdsAnteriores }
        },
        raw: true
    });
    const totalCartaoAnterior = despesasCartaoAnteriores.reduce((acc, dc) => acc + parseFloat(dc.valor || 0), 0);

    const saldoAnterior = totalReceitasAnteriores - totalDespesasAnteriores - totalCartaoAnterior;

    const receitasMesAtual = await Receita.findAll({
        where: {
            UserId: userId,
            [Op.and]: [
                literal(`EXTRACT(YEAR FROM "date") = ${ano}`),
                literal(`EXTRACT(MONTH FROM "date") = ${mes}`)
            ]
        },
        raw: true
    });
    const totalReceitasMesAtual = receitasMesAtual.reduce((acc, r) => acc + parseFloat(r.value || 0), 0);

    const despesasMesAtual = await Despesas.findAll({
        where: {
            UserId: userId,
            [Op.and]: [
                literal(`EXTRACT(YEAR FROM "date") = ${ano}`),
                literal(`EXTRACT(MONTH FROM "date") = ${mes}`)
            ]
        },
        raw: true
    });
    const totalDespesasMesAtual = despesasMesAtual.reduce((acc, d) => acc + parseFloat(d.valor || 0), 0);

    const faturasMesAtual = await Fatura.findAll({
        where: {
            CartaoId: { [Op.in]: cartaoIds },
            ano: ano,
            mes: mes
        },
        raw: true
    });
    const faturaIdsMesAtual = faturasMesAtual.map(f => f.id);

    const despesasCartaoMesAtual = await DespesaCartao.findAll({
        where: {
            FaturaId: { [Op.in]: faturaIdsMesAtual }
        },
        raw: true
    });
    const totalCartaoMesAtual = despesasCartaoMesAtual.reduce((acc, dc) => acc + parseFloat(dc.valor || 0), 0);

    const saldoMesAtual = totalReceitasMesAtual - totalDespesasMesAtual - totalCartaoMesAtual;
    const saldoPrevisto = saldoAnterior + totalReceitasMesAtual - totalDespesasMesAtual - totalCartaoMesAtual;
    
    console.log({
        saldoAnterior,
        totalReceitasMesAtual,
        totalDespesasMesAtual,
        totalCartaoMesAtual,
        saldoPrevisto
    });
    return {
        saldoAnterior,
        saldoMesAtual,
        saldoPrevisto,
        totalReceitasAnteriores,
        totalDespesasAnteriores,
        totalCartaoAnterior,
        totalReceitasMesAtual,
        totalDespesasMesAtual,
        totalCartaoMesAtual
    };
}

module.exports = calcularSaldoPorMes;
