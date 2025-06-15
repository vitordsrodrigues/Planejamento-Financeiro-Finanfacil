const Fatura = require('../models/Fatura');
const Cartao = require('../models/Cartao');
const DespesaCartao = require('../models/DespesaCartao')
const Categorias = require('../models/Categorias')
const CategoriaUsuario = require('../models/CategoriaUsuario')
const FinancaPessoais = require('../models/FinancaPessoais')
const { Op, literal } = require('sequelize');


class FaturaController {
  
     static async pagarFatura(req, res) {Add commentMore actions
        try {
            const faturaId = req.params.id;
    
            // Buscar a fatura
            const fatura = await Fatura.findByPk(faturaId);
    
            if (!fatura) {
                return res.json({ 
                    success: false, 
                    message: "Fatura não encontrada!" 
                });
            }
    
            if (fatura.status !== "Fechada") {
                return res.json({ 
                    success: false, 
                    message: "Esta fatura não pode ser paga pois não está fechada." 
                });
            }
    
            // Atualizar o status para "Paga"
            fatura.status = "Paga";
            await fatura.save();
    
            // Atualizar o limite do cartão
            const cartao = await Cartao.findByPk(fatura.CartaoId);
    
            if (cartao) {
                cartao.limite_disponivel = parseFloat(cartao.limite_disponivel) + parseFloat(fatura.valor_total);
                // Garantir que não ultrapasse o limite total
                if (cartao.limite_disponivel > cartao.limite_total) {
                    cartao.limite_disponivel = cartao.limite_total;
                }
                await cartao.save();
            }
    
            // Descontar o valor da fatura do saldo do usuário
            const userId = req.session.userid;
            let financaPessoal = await FinancaPessoais.findOne({ where: { UserId: userId } });
    
            // Criar o registro na tabela FinancaPessoais, se não existir
            if (!financaPessoal) {
                console.log(`Criando registro de Finanças Pessoais para o usuário ID ${userId}`);
                financaPessoal = await FinancaPessoais.create({
                    UserId: userId,
                    saldo: 0,
                    totalReceitas: 0,
                    totalDespesas: 0,
                    faturat: 0
                });
            }
    
            const valorFatura = parseFloat(fatura.valor_total);
    
            // Verificar se o valor da fatura é válido
            if (isNaN(valorFatura) || valorFatura <= 0) {
                console.error(`Valor inválido da fatura: ${valorFatura}`);
                return res.json({ 
                    success: false, 
                    message: "Erro ao processar o valor da fatura." 
                });
            }
    
            financaPessoal.saldo = parseFloat(financaPessoal.saldo || 0) - valorFatura;
    
            await financaPessoal.save();
    
            return res.json({ 
                success: true, 
                message: "Fatura paga com sucesso!"
            });
        } catch (error) {
            console.error("Erro ao pagar fatura:", error);
            return res.json({ 
                success: false, 
                message: "Erro ao processar pagamento." 
            });
        }
    }
    

    static async addDespesaCartao(req, res) {
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }
    
        try {
            // Extrair os dados do formulário
            const { CartaoId, descricao, valor, data_compra, CategoriaId } = req.body;
    
            // Verificar se o cartão pertence ao usuário
            const cartao = await Cartao.findOne({
                where: { 
                    id: CartaoId,
                    UserId: userId 
                }
            });
    
            if (!cartao) {
                req.flash('message', 'Cartão não encontrado.');
                req.session.save(() => {
                    return res.redirect('/financas/viewCartaos');
                });
                return;
            }
    
            // Verificar se há limite disponível suficiente
            const valorDespesa = parseFloat(valor);
            if (valorDespesa > parseFloat(cartao.limite_disponivel)) {
                req.flash('message', 'Despesa não pode ser adicionada. Limite do cartão insuficiente.');
                req.session.save(() => {
                    return res.redirect('/financas/viewCartaos');
                });
                return;
            }
    
            // Extrair o mês e ano da data da compra
            const dataCompra = new Date(data_compra);
            const mesCompra = dataCompra.getMonth() + 1; // getMonth() retorna 0-11
            const anoCompra = dataCompra.getFullYear();
            const diaCompra = dataCompra.getDate();
    
            // Obter o dia de fechamento e vencimento do cartão
            const diaFechamento = parseInt(cartao.dataFechamento);
            
            // Determinar em qual fatura a despesa será incluída
            let mesFatura = mesCompra;
            let anoFatura = anoCompra;
            
            // Verificar se a compra foi feita após o dia de fechamento
            // Se sim, a despesa vai para a fatura do próximo mês
            if (diaCompra >= diaFechamento) {
                // Calcular próximo mês e ano
                if (mesCompra === 12) {
                    mesFatura = 1;
                    anoFatura = anoCompra + 1;
                } else {
                    mesFatura = mesCompra + 1;
                }
            }
            
            // Buscar fatura aberta para o mês/ano determinado
            let faturaAtual = await Fatura.findOne({
                where: { 
                    CartaoId, 
                    mes: mesFatura,
                    ano: anoFatura,
                    status: 'Aberta' 
                }
            });
            
            // Se não encontrar uma fatura aberta, verificar se existe alguma fatura (de qualquer status) para este mês/ano
            if (!faturaAtual) {
                const faturaExistente = await Fatura.findOne({
                    where: {
                        CartaoId,
                        mes: mesFatura,
                        ano: anoFatura
                    }
                });
                
                // Se já existe uma fatura para este mês/ano mas não está aberta, devemos calcular o próximo mês
                if (faturaExistente) {
                    if (mesFatura === 12) {
                        mesFatura = 1;
                        anoFatura = anoFatura + 1;
                    } else {
                        mesFatura = mesFatura + 1;
                    }
                    
                    // Buscar ou criar fatura para o próximo mês
                    faturaAtual = await Fatura.findOne({
                        where: { 
                            CartaoId, 
                            mes: mesFatura,
                            ano: anoFatura,
                            status: 'Aberta' 
                        }
                    });
                    
                    if (!faturaAtual) {
                        faturaAtual = await Fatura.create({
                            CartaoId,
                            mes: mesFatura,
                            ano: anoFatura,
                            valor_total: 0,
                            status: 'Aberta'
                        });
                    }
                } else {
                    // Se não existe nenhuma fatura para este mês/ano, criar uma nova
                    faturaAtual = await Fatura.create({
                        CartaoId,
                        mes: mesFatura,
                        ano: anoFatura,
                        valor_total: 0,
                        status: 'Aberta'
                    });
                }
            }
    
            // Criar despesa
            await DespesaCartao.create({
                CartaoId,
                FaturaId: faturaAtual.id,
                descricao,
                valor: valorDespesa,
                data_compra,
                CategoriaId
            });
    
            // Atualizar o valor total da fatura
            faturaAtual.valor_total = parseFloat(faturaAtual.valor_total) + valorDespesa;
            await faturaAtual.save();
    
            // Atualizar o limite disponível do cartão
            cartao.limite_disponivel = parseFloat(cartao.limite_disponivel) - valorDespesa;
            await cartao.save();
    
            // Buscar ou criar o registro na tabela CategoriaUsuario
            let categoriaUsuario = await CategoriaUsuario.findOne({
                where: { CategoriaId, UserId: userId }
            });
    
            if (!categoriaUsuario) {
                console.log(`Criando registro na tabela CategoriaUsuario para CategoriaId ${CategoriaId} e UserId ${userId}`);
                categoriaUsuario = await CategoriaUsuario.create({
                    UserId: userId,
                    CategoriaId: CategoriaId,
                    totalRecebido: 0,
                    totalDespesas: 0,
                    totalDespesasCartao: 0
                });
            }
    
            // Incrementar o valor no campo totalDespesasCartao
            categoriaUsuario.totalDespesasCartao = parseFloat(categoriaUsuario.totalDespesasCartao || 0) + valorDespesa;
            await categoriaUsuario.save();
    
            req.flash('message', 'Despesa adicionada com sucesso!');
            req.session.save(() => {
                return res.redirect('/financas/viewCartaos');
            });
    
        } catch (error) {
            console.error('Erro ao adicionar despesa:', error);
            req.flash('message', 'Erro ao adicionar despesa. Tente novamente mais tarde.');
            req.flash('error', true);
            req.session.save(() => {
                return res.redirect('/financas/viewCartaos');
            });
        }
    }

    static async viewFaturas(req, res) {
        const userId = req.session.userid;
        if (!userId) {
            return res.redirect('/login');
        }

        try {
            const cartoes = await Cartao.findAll({
                where: { UserId: userId },
                raw: true
            });

            const cartaoIds = cartoes.map(c => c.id);
            const hoje = new Date();
            const mesAtual = hoje.getMonth() + 1;
            const anoAtual = hoje.getFullYear();

            const faturas = await Fatura.findAll({
                where: {
                    CartaoId: { [Op.in]: cartaoIds },
                    [Op.or]: [
                        {
                            [Op.and]: [
                                { mes: mesAtual },
                                { ano: anoAtual }
                            ]
                        },
                        {
                            [Op.and]: [
                                { mes: mesAtual === 1 ? 12 : mesAtual - 1 },
                                { ano: mesAtual === 1 ? anoAtual - 1 : anoAtual }
                            ]
                        }
                    ]
                },
                include: [
                    {
                        model: Cartao,
                        attributes: ['nome', 'diaFechamento', 'diaVencimento']
                    }
                ],
                order: [
                    ['ano', 'DESC'],
                    ['mes', 'DESC']
                ]
            });

            res.render('financas/viewFaturas', {
                faturas,
                cartoes,
                mesAtual,
                anoAtual
            });
        } catch (error) {
            console.error('Erro ao buscar faturas:', error);
            req.flash('error', 'Erro ao carregar faturas');
            res.redirect('/financas/dashboard');
        }
    }

    static async createFatura(req, res) {
        const userId = req.session.userid;
        if (!userId) {
            return res.redirect('/login');
        }

        try {
            const { CartaoId, mes, ano } = req.body;

            // Verificar se já existe uma fatura para este cartão/mês/ano
            const faturaExistente = await Fatura.findOne({
                where: {
                    CartaoId,
                    mes,
                    ano
                }
            });

            if (faturaExistente) {
                req.flash('error', 'Já existe uma fatura para este cartão neste período');
                return res.redirect('/financas/faturas');
            }

            // Criar nova fatura
            await Fatura.create({
                CartaoId,
                mes,
                ano,
                status: 'Aberta'
            });

            req.flash('success', 'Fatura criada com sucesso');
            res.redirect('/financas/faturas');
        } catch (error) {
            console.error('Erro ao criar fatura:', error);
            req.flash('error', 'Erro ao criar fatura');
            res.redirect('/financas/faturas');
        }
    }

    static async updateFatura(req, res) {
        const userId = req.session.userid;
        if (!userId) {
            return res.redirect('/login');
        }

        try {
            const { id, status } = req.body;

            const fatura = await Fatura.findByPk(id, {
                include: [{ model: Cartao }]
            });

            if (!fatura) {
                req.flash('error', 'Fatura não encontrada');
                return res.redirect('/financas/faturas');
            }

            // Verificar se o usuário tem permissão para editar esta fatura
            const cartao = await Cartao.findOne({
                where: {
                    id: fatura.CartaoId,
                    UserId: userId
                }
            });

            if (!cartao) {
                req.flash('error', 'Você não tem permissão para editar esta fatura');
                return res.redirect('/financas/faturas');
            }

            fatura.status = status;
            await fatura.save();

            req.flash('success', 'Fatura atualizada com sucesso');
            res.redirect('/financas/faturas');
        } catch (error) {
            console.error('Erro ao atualizar fatura:', error);
            req.flash('error', 'Erro ao atualizar fatura');
            res.redirect('/financas/faturas');
        }
    }

    static async deleteFatura(req, res) {
        const userId = req.session.userid;
        if (!userId) {
            return res.redirect('/login');
        }

        try {
            const { id } = req.params;

            const fatura = await Fatura.findByPk(id, {
                include: [{ model: Cartao }]
            });

            if (!fatura) {
                req.flash('error', 'Fatura não encontrada');
                return res.redirect('/financas/faturas');
            }

            // Verificar se o usuário tem permissão para excluir esta fatura
            const cartao = await Cartao.findOne({
                where: {
                    id: fatura.CartaoId,
                    UserId: userId
                }
            });

            if (!cartao) {
                req.flash('error', 'Você não tem permissão para excluir esta fatura');
                return res.redirect('/financas/faturas');
            }

            // Verificar se existem despesas associadas
            const despesas = await DespesaCartao.findAll({
                where: { FaturaId: id }
            });

            if (despesas.length > 0) {
                req.flash('error', 'Não é possível excluir uma fatura que possui despesas associadas');
                return res.redirect('/financas/faturas');
            }

            await fatura.destroy();

            req.flash('success', 'Fatura excluída com sucesso');
            res.redirect('/financas/faturas');
        } catch (error) {
            console.error('Erro ao excluir fatura:', error);
            req.flash('error', 'Erro ao excluir fatura');
            res.redirect('/financas/faturas');
        }
    }
}



module.exports = FaturaController;
