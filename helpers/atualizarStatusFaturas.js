const Fatura = require('../models/Fatura');
const Cartao = require('../models/Cartao');
const { Op, literal } = require('sequelize');
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

        for (const fatura of faturas) {
            const cartao = fatura.Cartao;
            if (!cartao) {
                console.log(`Cartão não encontrado para a fatura ${fatura.id}`);
                continue;
            }

            const diaFechamento = cartao.diaFechamento;
            const diaVencimento = cartao.diaVencimento;

            // Verifica se é hora de fechar a fatura
            if (diaAtual >= diaFechamento && fatura.status === 'Aberta') {
                console.log(`Fechando fatura ${fatura.id} do cartão ${cartao.nome}`);
                fatura.status = 'Fechada';
                await fatura.save();
            }

            // Verifica se é hora de vencer a fatura
            if (diaAtual >= diaVencimento && fatura.status === 'Fechada') {
                console.log(`Vencendo fatura ${fatura.id} do cartão ${cartao.nome}`);
                fatura.status = 'Vencida';
                await fatura.save();
            }
        }

        console.log('Verificação de status de faturas concluída com sucesso');
    } catch (error) {
        console.error('Erro ao atualizar status das faturas:', error);
    }
}

module.exports = atualizarStatusFaturas;