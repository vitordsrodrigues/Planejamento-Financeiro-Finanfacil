const FinancaPessoais = require('../models/FinancaPessoais')
const User = require('../models/User')
const Despesas = require('../models/Despesas')
const TotalDespesas = require('../models/TotalDespesas')
const Cartao = require('../models/Cartao')
const Receita = require('../models/Receita')

    const { Op } = require('sequelize'); // Certifique-se de importar o operador Op no topo do arquivo




module.exports = class FinancasControllers{
    static async showMain(req, res) {
        if (req.session.userid) {
            return res.redirect('/financas/dashboard'); // Redireciona direto para o dashboard
        }
        res.render('financas/home');
    }

    static async dashboard(req, res) {
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }
    
        try {
            const financas = await FinancaPessoais.findOne({ where: { UserId: userId } });
            const totalReceitas = financas ? parseFloat(financas.totalReceitas) || 0 : 0;
            const saldo = financas ? parseFloat(financas.saldo) || 0 : 0;
            const totalDespesas = financas ? parseFloat(financas.totalDespesas) || 0 : 0;
            
            return res.render('financas/dashboard', { totalReceitas, saldo, totalDespesas });
        } catch (error) {
            console.error('Erro ao carregar o dashboard:', error);
            return res.render('financas/dashboard', { totalReceitas: 0, saldo: 0, totalDespesas: 0 });
        }
    }
    
    static async viewSaldo(req,res){
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }

        try{
            const financas = await FinancaPessoais.findOne({ where: { UserId: userId } });
            const saldo = financas ? parseFloat(financas.saldo) || 0 : 0;
            return res.render('financas/saldo',{saldo})
        }catch(error){
            console.error('Erro ao carregar o dashboard:', error);
            return res.render('financas/saldo', {saldo: 0});
        }
    
       
    }
    // Controller: viewReceitas

    static async viewReceitas(req, res) {
        const userId = req.session.userid;

        if (!userId) {
            return res.redirect('/login');
        }

        let anoAtual = parseInt(req.query.ano) || new Date().getFullYear();
        let mesAtual = parseInt(req.query.mes) || (new Date().getMonth() + 1); // Começando de 1 para Janeiro

        // Verificar se o usuário quer avançar ou retroceder
        if (req.query.avancar) {
            mesAtual += 1;
            if (mesAtual > 12) {
                mesAtual = 1;
                anoAtual += 1;
            }
        } else if (req.query.retroceder) {
            mesAtual -= 1;
            if (mesAtual < 1) {
                mesAtual = 12;
                anoAtual -= 1;
            }
        }

        const meses = [
            { nome: 'Janeiro', index: 1 }, { nome: 'Fevereiro', index: 2 }, { nome: 'Março', index: 3 }, { nome: 'Abril', index: 4 },
            { nome: 'Maio', index: 5 }, { nome: 'Junho', index: 6 }, { nome: 'Julho', index: 7 }, { nome: 'Agosto', index: 8 },
            { nome: 'Setembro', index: 9 }, { nome: 'Outubro', index: 10 }, { nome: 'Novembro', index: 11 }, { nome: 'Dezembro', index: 12 }
        ];

        const inicioMes = new Date(Date.UTC(anoAtual, mesAtual - 1, 1, 0, 0, 0));
        const fimMes = new Date(Date.UTC(anoAtual, mesAtual, 0, 23, 59, 59, 999));

        const receitasMesAtual = await Receita.findAll({
            where: {
                UserId: userId,
                date: {
                    [Op.gte]: inicioMes, // Início do mês à meia-noite UTC
                    [Op.lte]: fimMes // Último dia do mês às 23:59:59 UTC
                }
            },
            raw: true
        });

        // Calcular os totais
        let totalRecebido = 0, totalPendente = 0, totalMes = 0;
        const hoje = new Date();

        receitasMesAtual.forEach(receita => {
            let dataReceita = new Date(receita.date);
            let valorReceita = parseFloat(receita.value) || 0;
            if (dataReceita <= hoje) {
                totalRecebido += valorReceita;
            } else {
                totalPendente += valorReceita;
            }
            totalMes += valorReceita;
        });
 
        // Buscar saldo do usuário
        const financaspessoais = await FinancaPessoais.findAll({ where: { UserId: userId }, raw: true });

        const nomeMesAtual = meses[mesAtual - 1].nome;

        // Passar o nome do mês junto com os dados
        res.render('financas/viewReceitas', {
            receitas: receitasMesAtual,
            financaspessoais,
            totalRecebido,
            totalPendente,
            totalMes,
            anoAtual,
            mesAtual,
            meses,
            nomeMesAtual  // Adiciona o nome do mês
        });
    }


    static async createReceitaSave(req, res) {
        const userId = req.session.userid;
    
        const receita = {
            title: req.body.title,
            value: parseFloat(req.body.value),
            date: req.body.date,
            UserId: userId
        };
    
        try {
            await Receita.create(receita);
    
            // Buscar todas as receitas do usuário e calcular o total
            const todasReceitas = await Receita.findAll({
                where: { UserId: userId },
                attributes: ['value'],
                raw: true
            });
    
            let totalReceitas = todasReceitas.reduce((acc, receita) => acc + parseFloat(receita.value || 0), 0);
    
            // Buscar o saldo total do usuário
            let financas = await FinancaPessoais.findOne({ where: { UserId: userId } });
    
            if (financas) {
                let saldoAtual = parseFloat(financas.saldo) || 0;
                let receitaValor = parseFloat(receita.value) || 0;
    
                financas.saldo = saldoAtual + receitaValor;
                financas.totalReceitas = totalReceitas; // Atualiza o total de receitas
                await financas.save();
            } else {
                await FinancaPessoais.create({
                    UserId: userId,
                    saldo: parseFloat(receita.value) || 0,
                    totalReceitas: totalReceitas
                });
            }
    
            req.flash('message', 'Receita criada com sucesso');
    
            req.session.save(() => {
                res.redirect('/financas/viewReceitas');
            });
        } catch (error) {
            console.log('Aconteceu um erro: ' + error);
            return res.redirect('/financas/viewReceitas'); // Garante que sempre há uma resposta
        }
    }
    

    static async viewDespesas(req, res) {
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }
    
        let anoAtual = parseInt(req.query.ano) || new Date().getFullYear();
        let mesAtual = parseInt(req.query.mes) || (new Date().getMonth() + 1);
    
        if (req.query.avancar) {
            mesAtual += 1;
            if (mesAtual > 12) {
                mesAtual = 1;
                anoAtual += 1;
            }
        } else if (req.query.retroceder) {
            mesAtual -= 1;
            if (mesAtual < 1) {
                mesAtual = 12;
                anoAtual -= 1;
            }
        }
    
        const meses = [
            { nome: 'Janeiro', index: 1 }, { nome: 'Fevereiro', index: 2 }, { nome: 'Março', index: 3 }, { nome: 'Abril', index: 4 },
            { nome: 'Maio', index: 5 }, { nome: 'Junho', index: 6 }, { nome: 'Julho', index: 7 }, { nome: 'Agosto', index: 8 },
            { nome: 'Setembro', index: 9 }, { nome: 'Outubro', index: 10 }, { nome: 'Novembro', index: 11 }, { nome: 'Dezembro', index: 12 }
        ];
    
        const inicioMes = new Date(Date.UTC(anoAtual, mesAtual - 1, 1, 0, 0, 0));
        const fimMes = new Date(Date.UTC(anoAtual, mesAtual, 0, 23, 59, 59, 999));
    
        const despesasMesAtual = await Despesas.findAll({
            where: {
                UserId: userId,
                date: {
                    [Op.gte]: inicioMes,
                    [Op.lte]: fimMes
                }
            },
            raw: true
        });
    
        let totalPago = 0, totalPendente = 0, totalMes = 0;
        const hoje = new Date();
    
        despesasMesAtual.forEach(despesa => {
            let dataDespesa = new Date(despesa.date);
            let valorDespesa = parseFloat(despesa.valor) || 0;
            if (dataDespesa <= hoje) {
                totalPago += valorDespesa;
            } else {
                totalPendente += valorDespesa;
            }
            totalMes += valorDespesa;
        });
    
        const financaspessoais = await FinancaPessoais.findAll({ where: { UserId: userId }, raw: true });
        const nomeMesAtual = meses[mesAtual - 1].nome;
    
        res.render('financas/viewDespesas', {
            despesas: despesasMesAtual,
            financaspessoais,
            totalPago,
            totalPendente,
            totalMes,
            anoAtual,
            mesAtual,
            meses,
            nomeMesAtual
        });
    }
    

    

    static async createDespesaSave(req, res) {
        const userId = req.session.userid;
        
        const despesa = {
            title: req.body.title,
            valor: parseFloat(req.body.valor),
            date: req.body.date,
            UserId: userId
        };
    
        try {
            await Despesas.create(despesa);
    
            // Buscar todas as despesas do usuário e calcular o total
            const todasDespesas = await Despesas.findAll({
                where: { UserId: userId },
                attributes: ['valor'],
                raw: true
            });
    
            let totalDespesas = todasDespesas.reduce((acc, despesa) => acc + parseFloat(despesa.valor || 0), 0);
    
            // Buscar o saldo total do usuário
            let financas = await FinancaPessoais.findOne({ where: { UserId: userId } });
    
            if (financas) {
                let saldoAtual = parseFloat(financas.saldo) || 0;
                let despesaValor = parseFloat(despesa.valor) || 0;
    
                financas.saldo = saldoAtual - despesaValor; // Subtrai a despesa do saldo
                financas.totalDespesas = totalDespesas; // Atualiza o total de despesas
                await financas.save();
            } else {
                await FinancaPessoais.create({
                    UserId: userId,
                    saldo: -parseFloat(despesa.valor) || 0, // Inicializa com valor negativo
                    totalDespesas: totalDespesas
                });
            }
    
            req.flash('message', 'Despesa criada com sucesso');
    
            req.session.save(() => {
                res.redirect('/financas/viewDespesas');
            });
        } catch (error) {
            console.log('Aconteceu um erro: ' + error);
            return res.redirect('/financas/viewDespesas'); // Garante que sempre há uma resposta
        }
    }
    
    static async viewCartaos(req,res){

        const userId = req.session.userid

        const cartaos = await Cartao.findAll({
            where: { UserId: userId }, // Filtra receitas pelo usuário logado
            raw: true // Retorna apenas os valores dos dados, sem metadados do Sequelize
        });

        if(!userId){
            return res.redirect('/login')
        }
        res.render('financas/viewCartaos',{cartaos})
    }

    static async createCartaoSave(req,res){

        const cartao ={
            name:req.body.name,
            limite:req.body.limite,
            dataFechamento:req.body.dataFechamento,
            datavence:req.body.datavence,
            fatura:req.body.fatura,
            UserId: req.session.userid
        }

        try{
            await Cartao.create(cartao)

             req.flash('message', 'Cartão criado com sucesso')
    
             req.session.save(()=>{
                 res.redirect('/financas/viewCartaos')
            })
        }catch(error){
            console.log('aconteceu um erro' + error)
        }
    }
    
    static async removeReceita(req, res) {
        const id = req.body.id;
        const UserId = req.session.userid;
    
        try {
            // Buscar a receita antes de remover
            const receita = await Receita.findOne({ where: { id: id, UserId: UserId } });
    
            if (!receita) {
                req.flash('error', 'Receita não encontrada!');
                return res.redirect('/financas/viewReceitas');
            }
    
            // Buscar o saldo atual do usuário
            let financas = await FinancaPessoais.findOne({ where: { UserId: UserId } });
    
            if (financas) {
                let saldoAtual = parseFloat(financas.saldo) || 0;
                let receitaValor = parseFloat(receita.value) || 0;
    
                // Subtrair o valor da receita do saldo
                financas.saldo = saldoAtual - receitaValor;
                await financas.save();
            }
    
            // Agora, remover a receita
            await Receita.destroy({ where: { id: id, UserId: UserId } });
    
            req.flash('message', 'Receita removida com sucesso!');
            req.session.save(() => {
                res.redirect('/financas/viewReceitas');
            });
        } catch (error) {
            console.log(`Aconteceu um erro: ` + error);
            return res.redirect('/financas/viewReceitas'); // Garante que sempre há uma resposta
        }
    }
    

    static async removeDespesa(req,res){

        const id = req.body.id
        const UserId = req.session.userid

        try{
            await Despesas.destroy({where:{id:id,UserId:UserId}})
            req.session.save(()=>{
                res.redirect('/financas/viewDespesas')
            })
        }catch(error){
            console.log(`aconteceu um erro` + error)
        }
        
    }

    static async removeCartao(req,res){

        const id = req.body.id
        const UserId = req.session.userid

        try{
            await Cartao.destroy({where:{id:id,UserId:UserId}})
            req.session.save(()=>{
                res.redirect('/financas/viewCartaos')
            })
        }catch(error){
            console.log(`aconteceu um erro` + error)
        }
        
    }
    
   
    static async updateReceitaSave(req, res) {
        const id = req.body.id;
    
        const receita = {
            title: req.body.title,
            value: req.body.value,
            date: req.body.date
        };
    
        try {
            // Obtém a receita atual antes da atualização para pegar o UserId
            const receitaAtual = await Receita.findOne({ where: { id } });
            if (!receitaAtual) {
                req.flash('message', 'Receita não encontrada');
                return res.redirect('/financas/viewReceitas');
            }
    
            const userId = receitaAtual.UserId; // Aqui utilizamos 'UserId' em vez de 'userId'
    
            // Atualiza a receita no banco de dados
            await Receita.update(receita, { where: { id } });
    
            // Recalcula o saldo do usuário somando todas as receitas dele
            const totalReceitas = await Receita.sum('value', { where: { UserId: userId } });
    
            // Atualiza o saldo do usuário na tabela de FinancaPessoais
            await FinancaPessoais.update({ saldo: totalReceitas }, { where: { UserId: userId } });
    
            req.flash('message', 'Receita atualizada com sucesso');
            req.session.save(() => {
                res.redirect('/financas/viewReceitas');
            });
        } catch (err) {
            console.log(err);
            req.flash('message', 'Erro ao atualizar receita');
            res.redirect('/financas/viewReceitas');
        }
    }
    
    

    static async updateDespesaSave(req,res){

        const id = req.body.id

        const despesa = {
            title:req.body.title,
            valor:req.body.valor,
            date:req.body.date,
        }

        await Despesas.update(despesa,{where:{id:id}})
        try{
            req.flash('message', 'despesa atualizada com sucesso')
            req.session.save(()=>{
                res.redirect('/financas/viewDespesas')
            })
            }catch(err){
                console.log(err)
            }
    }
    
}