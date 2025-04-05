const Fatura = require('../models/Fatura');
const Cartao = require('../models/Cartao');
const { Op } = require('sequelize');
const moment = require('moment');

async function atualizarStatusFaturas() {
    const hoje = moment();
    const diaAtual = hoje.date();
    const mesAtual = hoje.month() + 1; // Mês atual (1 = Janeiro)
    const anoAtual = hoje.year();
    
    console.log(`Executando verificação de status de faturas em ${diaAtual}/${mesAtual}/${anoAtual}`);

    try {
        // Buscar todas as faturas abertas junto com seus cartões
        const faturas = await Fatura.findAll({
            where: { 
                status: 'Aberta',
                // Garantir que estamos verificando faturas do mês atual ou anterior apenas
                [Op.or]: [
                    {
                        [Op.and]: [
                            { mes: mesAtual },
                            { ano: anoAtual }
                        ]
                    },
                    // Mês anterior (para casos de virada de mês)
                    {
                        [Op.and]: [
                            { mes: mesAtual === 1 ? 12 : mesAtual - 1 },
                            { ano: mesAtual === 1 ? anoAtual - 1 : anoAtual }
                        ]
                    }
                ]
            },
            include: [{ model: Cartao }]
        });
        
        console.log(`Encontradas ${faturas.length} faturas abertas para verificação`);

        for (let fatura of faturas) {
            const cartao = fatura.Cartao;
            if (!cartao) {
                console.log(`Fatura ${fatura.id} não tem cartão associado. Pulando.`);
                continue;
            }
            
            console.log(`Verificando fatura ${fatura.id} do cartão ${cartao.name} (ID: ${cartao.id})`);
            console.log(`Mês/Ano da fatura: ${fatura.mes}/${fatura.ano}, Dia de fechamento: ${cartao.dataFechamento}`);
            
            // Determinar se a fatura deve ser fechada baseado na data atual
            let deveFechada = false;
            
            // Se estamos no mesmo mês/ano da fatura
            if (fatura.mes === mesAtual && fatura.ano === anoAtual) {
                // Fechar se o dia atual é igual ou maior que o dia de fechamento
                deveFechada = diaAtual >= cartao.dataFechamento;
                console.log(`Mesmo mês/ano - Hoje: ${diaAtual}, Fechamento: ${cartao.dataFechamento}, Deve fechar? ${deveFechada}`);
            } 
            // Se estamos no mês seguinte ao da fatura
            else if (
                (fatura.mes === 12 && mesAtual === 1 && fatura.ano === anoAtual - 1) || // Virada de ano
                (fatura.mes === mesAtual - 1 && fatura.ano === anoAtual) // Mesmo ano
            ) {
                // Se estamos no mês seguinte, a fatura do mês anterior deve ser fechada
                deveFechada = true;
                console.log(`Mês seguinte - Fatura deve ser fechada automaticamente`);
            }
            
            // Fechar fatura se necessário
            if (deveFechada) {
                const statusAnterior = fatura.status;
                fatura.status = 'Fechada';
                await fatura.save();
                console.log(`Fatura ${fatura.id} foi alterada: ${statusAnterior} -> Fechada!`);
            } else {
                console.log(`Fatura ${fatura.id} mantida como Aberta.`);
            }
        }

        console.log('Atualização de status concluída!');
    } catch (error) {
        console.error('Erro ao atualizar status das faturas:', error);
    }
}

module.exports = atualizarStatusFaturas;