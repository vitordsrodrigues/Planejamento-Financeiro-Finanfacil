const Fatura = require('../models/Fatura');
const Cartao = require('../models/Cartao');
const DespesaCartao = require('../models/DespesaCartao')
const Categorias = require('../models/Categorias')
const CategoriaUsuario = require('../models/CategoriaUsuario')
const FinancaPessoais = require('../models/FinancaPessoais')


class FaturaController {
  
    static async pagarFatura(req, res) {
        const sequelize = require('../config/sequelize'); // ajuste o path se necessário
        const userId = req.session.userid;
    
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Sessão expirada ou usuário não autenticado."
            });
        }
    
        try {
            const faturaId = req.params.id;
    
            // Buscar a fatura
            const fatura = await Fatura.findByPk(faturaId);
    
            if (!fatura) {
                return res.json({ success: false, message: "Fatura não encontrada!" });
            }
    
            // Buscar o cartão e validar dono
            const cartao = await Cartao.findByPk(fatura.CartaoId);
            if (!cartao || cartao.UserId !== userId) {
                return res.status(403).json({ success: false, message: "Acesso negado à fatura." });
            }
    
            if (fatura.status === "Paga") {
                return res.json({ success: false, message: "Esta fatura já foi paga." });
            }
    
            if (fatura.status !== "Fechada") {
                return res.json({
                    success: false,
                    message: "Esta fatura não pode ser paga pois não está fechada."
                });
            }
    
            const valorFatura = parseFloat(fatura.valor_total);
    
            if (isNaN(valorFatura) || valorFatura < 0) {
                console.error(`Valor inválido da fatura: ${valorFatura}`);
                return res.json({
                    success: false,
                    message: "Erro ao processar o valor da fatura."
                });
            }
    
            // Buscar ou criar o registro de Finanças Pessoais
            let financaPessoal = await FinancaPessoais.findOne({ where: { UserId: userId } });
    
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
    
            // Transação segura para atualizar tudo
            await sequelize.transaction(async (t) => {
                // Marcar fatura como paga
                fatura.status = "Paga";
                await fatura.save({ transaction: t });
    
                // Atualizar limite do cartão
                cartao.limite_disponivel = Math.min(
                    parseFloat(cartao.limite_disponivel || 0) + valorFatura,
                    parseFloat(cartao.limite_total)
                );
                await cartao.save({ transaction: t });
    
                // Atualizar saldo do usuário (apenas se valor > 0)
                if (valorFatura > 0) {
                    financaPessoal.saldo = parseFloat(financaPessoal.saldo || 0) - valorFatura;
                    await financaPessoal.save({ transaction: t });
                }
            });
    
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
                req.flash('error', true);
                req.session.save(() => {
                    return res.redirect('/financas/viewCartaos');
                });
                return;
            }
    
            // Verificar se há limite disponível suficiente
            const valorDespesa = parseFloat(valor);
            if (valorDespesa > parseFloat(cartao.limite_disponivel)) {
                req.flash('message', 'Despesa não pode ser adicionada. Limite do cartão insuficiente.');
                req.flash('error', true);
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
}



module.exports = FaturaController;
