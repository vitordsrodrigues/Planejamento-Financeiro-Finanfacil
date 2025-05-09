const FinancaPessoais = require('../models/FinancaPessoais')
const User = require('../models/User')
const Despesas = require('../models/Despesas')
const Cartao = require('../models/Cartao')
const DespesaCartao = require('../models/DespesaCartao')
const Fatura = require('../models/Fatura')
const Receita = require('../models/Receita')
const Categorias = require('../models/Categorias')
const CategoriaUsuario = require('../models/CategoriaUsuario')
const { Op } = require('sequelize'); // Certifique-se de importar o operador Op no topo do arquivo
const sequelize = require('../db/conn') // Importa a instância do sequelize já configurada

module.exports = class FinancasControllers{

    static async showMain(req, res) {
        if (req.session.userid) {
            return res.redirect('/financas/dashboard'); // Redireciona direto para o dashboard
        }
        res.render('financas/home', { isHome: true })

    }
 
    static async dashboard(req, res) {
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }
    
        try {
            // Obtém o mês e ano dos parâmetros ou usa o mês/ano atual
            const mesAtual = parseInt(req.query.mes) || new Date().getMonth() + 1; // Meses começam em 0
            const anoAtual = parseInt(req.query.ano) || new Date().getFullYear();
    
            // Gera uma lista de meses e anos disponíveis
            const meses = [
                { valor: 1, nome: 'Janeiro' },
                { valor: 2, nome: 'Fevereiro' },
                { valor: 3, nome: 'Março' },
                { valor: 4, nome: 'Abril' },
                { valor: 5, nome: 'Maio' },
                { valor: 6, nome: 'Junho' },
                { valor: 7, nome: 'Julho' },
                { valor: 8, nome: 'Agosto' },
                { valor: 9, nome: 'Setembro' },
                { valor: 10, nome: 'Outubro' },
                { valor: 11, nome: 'Novembro' },
                { valor: 12, nome: 'Dezembro' }
            ];
    
            const anoAtualInt = new Date().getFullYear();
            const anosDisponiveis = [];
            for (let i = anoAtualInt - 5; i <= anoAtualInt + 5; i++) {
                anosDisponiveis.push(i);
            }
    
            // Buscar receitas do mês selecionado
            const receitasMesAtual = await Receita.findAll({
                where: {
                    UserId: userId,
                    [Op.and]: [
                        sequelize.where(sequelize.fn('MONTH', sequelize.col('date')), mesAtual),
                        sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), anoAtual)
                    ]
                },
                include: [
                    {
                        model: Categorias, // Inclui os dados da categoria associada
                        attributes: ['name'] // Pega apenas o nome da categoria
                    }
                ],
                raw: true,
                nest: true // Mantém os dados organizados corretamente
            });
    
            const totalReceitas = receitasMesAtual.reduce((acc, receita) => acc + parseFloat(receita.value || 0), 0);
    
            // Buscar despesas do mês selecionado
            const despesasMesAtual = await Despesas.findAll({
                where: {
                    UserId: userId,
                    [Op.and]: [
                        sequelize.where(sequelize.fn('MONTH', sequelize.col('date')), mesAtual),
                        sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), anoAtual)
                    ]
                },
                include: [
                    {
                        model: Categorias, // Inclui os dados da categoria associada
                        attributes: ['name'] // Pega apenas o nome da categoria
                    }
                ],
                raw: true,
                nest: true // Mantém os dados organizados corretamente
            });
    
            const totalDespesas = despesasMesAtual.reduce((acc, despesa) => acc + parseFloat(despesa.valor || 0), 0);
    
            // Buscar cartões do usuário
            const cartoes = await Cartao.findAll({
                where: { UserId: userId },
                attributes: ['id'],
                raw: true
            });
    
            const cartaoIds = cartoes.map(c => c.id);
    
            // Buscar faturas do mês atual que pertencem aos cartões do usuário
            const faturasMesAtual = await Fatura.findAll({
                where: {
                    CartaoId: { [Op.in]: cartaoIds },
                    mes: mesAtual,
                    ano: anoAtual
                },
                attributes: ['id'],
                raw: true
            });
    
            const faturaIds = faturasMesAtual.map(f => f.id);
    
            // Buscar despesas associadas às faturas do mês atual
            const despesasCartao = await DespesaCartao.findAll({
                where: {
                    FaturaId: { [Op.in]: faturaIds }
                },
                include: [
                    {
                        model: Categorias,
                        attributes: ['name']
                    }
                ],
                raw: true,
                nest: true
            });
    
            const totalCartao = despesasCartao.reduce((acc, despesa) => acc + parseFloat(despesa.valor || 0), 0);
    
            // Processar receitas por categoria
            const receitas = receitasMesAtual.reduce((acc, receita) => {
                const categoria = acc.find(r => r.nome === receita.Categoria.name);
                if (categoria) {
                    categoria.valor += parseFloat(receita.value || 0);
                } else {
                    acc.push({
                        nome: receita.Categoria.name,
                        valor: parseFloat(receita.value || 0)
                    });
                }
                return acc;
            }, []).map(c => ({
                nome: c.nome,
                valor: c.valor,
                porcentagem: totalReceitas > 0 ? ((c.valor / totalReceitas) * 100).toFixed(2) : 0
            }));
    
            // Processar despesas por categoria
            const despesas = despesasMesAtual.reduce((acc, despesa) => {
                const categoria = acc.find(d => d.nome === despesa.Categoria.name);
                if (categoria) {
                    categoria.valor += parseFloat(despesa.valor || 0);
                } else {
                    acc.push({
                        nome: despesa.Categoria.name,
                        valor: parseFloat(despesa.valor || 0)
                    });
                }
                return acc;
            }, []).map(c => ({
                nome: c.nome,
                valor: c.valor,
                porcentagem: totalDespesas > 0 ? ((c.valor / totalDespesas) * 100).toFixed(2) : 0
            }));
    
            // Processar gastos no cartão por categoria
            const cartoesCategorias = despesasCartao.reduce((acc, despesa) => {
                const categoria = acc.find(c => c.nome === despesa.Categoria.name);
                if (categoria) {
                    categoria.valor += parseFloat(despesa.valor || 0);
                } else {
                    acc.push({
                        nome: despesa.Categoria.name,
                        valor: parseFloat(despesa.valor || 0)
                    });
                }
                return acc;
            }, []).map(c => ({
                nome: c.nome,
                valor: c.valor,
                porcentagem: totalCartao > 0 ? ((c.valor / totalCartao) * 100).toFixed(2) : 0
            }));
    
            // Cálculo para o gráfico de porcentagem geral
            const totalGeral = totalReceitas + totalDespesas + totalCartao;
    
            const graficoGeral = [
                {
                    nome: 'Receitas',
                    valor: totalReceitas,
                    porcentagem: totalGeral > 0 ? ((totalReceitas / totalGeral) * 100).toFixed(2) : 0
                },
                {
                    nome: 'Despesas',
                    valor: totalDespesas,
                    porcentagem: totalGeral > 0 ? ((totalDespesas / totalGeral) * 100).toFixed(2) : 0
                },
                {
                    nome: 'Faturas de Cartões',
                    valor: totalCartao,
                    porcentagem: totalGeral > 0 ? ((totalCartao / totalGeral) * 100).toFixed(2) : 0
                }
            ];
    
            // Buscar o saldo diretamente da tabela FinancaPessoais
            const financas = await FinancaPessoais.findOne({ where: { UserId: userId } });
    
            // Garantir que o saldo seja um número válido
            const saldo = financas ? parseFloat(financas.saldo) || 0 : 0;
    
            // Calcular o saldo inicial
            const saldoInicial = saldo - totalReceitas - totalCartao + totalDespesas;
    

        // Adicionar lógica para links personalizados
        let linksPersonalizados = [];

        // Condição: Fatura muito alta
        if (totalCartao > totalReceitas) {
            linksPersonalizados.push({
                titulo: 'Cartão de Crédito: Vilão ou Aliado?',
                descricao: 'Sua fatura está alta. Veja dicas para reduzir seus gastos no cartão.',
                url: 'https://vitordsrodrigues.github.io/Blog_FinanFacil/cartao.html'
            });
        }

        // Condição: Despesas muito altas
        if (totalDespesas > totalReceitas) {
            linksPersonalizados.push({
                titulo: 'Controle suas despesas!',
                descricao: 'Você está gastando muito. Veja como economizar.',
                url: 'https://vitordsrodrigues.github.io/Blog_FinanFacil/orcamento.html'
            });
        }

        // Links padrão (alternados)
        const linksPadrao = [
            {
                titulo: 'Educação Financeira na Prática: O que Você Nunca Aprendeu na Escola',
                descricao: 'Aprenda como economizar e melhorar sua saúde financeira.',
                url: 'https://vitordsrodrigues.github.io/Blog_FinanFacil/educacional.html'
            },
            {
                titulo: 'Por Onde Começar: Guia Rápido para Organizar suas Finanças Pessoais',
                descricao: 'Comece sua jornada financeira com passos simples e práticos. Neste post, mostramos como mapear seus gastos, definir metas e evitar erros comuns.',
                url: 'https://vitordsrodrigues.github.io/Blog_FinanFacil/guia_rapida.html'
            }
        ];

        // Alternar entre links personalizados
        let linkExibido;
        if (linksPersonalizados.length > 1) {
            // Alternar entre os links personalizados
            const ultimoLinkExibido = req.session.ultimoLinkExibido || 0;
            linkExibido = linksPersonalizados[ultimoLinkExibido % linksPersonalizados.length];
            req.session.ultimoLinkExibido = (ultimoLinkExibido + 1) % linksPersonalizados.length;
        } else if (linksPersonalizados.length === 1) {
            // Exibir o único link personalizado disponível
            linkExibido = linksPersonalizados[0];
        } else {
            // Exibir um link padrão aleatório
            linkExibido = linksPadrao[Math.floor(Math.random() * linksPadrao.length)];
        }

        // Passar o link selecionado para a view
        return res.render('financas/dashboard', {
            totalReceitas,
            totalDespesas,
            totalCartao,
            saldoInicial,
            saldo,
            despesas: JSON.stringify(despesas),
            receitas: JSON.stringify(receitas),
            cartoes: JSON.stringify(cartoesCategorias),
            graficoGeral: JSON.stringify(graficoGeral),
            mesAtual,
            anoAtual,
            meses,
            anosDisponiveis,
            mesAtualNome: meses.find(m => m.valor === mesAtual).nome,
            linkExibido // Passar apenas o link selecionado para a view
        });
    
        } catch (error) {
            console.error('Erro ao carregar o dashboard:', error);
            return res.render('financas/dashboard', {
                totalReceitas: 0,
                totalDespesas: 0,
                totalCartao: 0,
                despesas: '[]',
                receitas: '[]',
                cartoes: '[]',
                graficoGeral: '[]',
                mesAtual: new Date().getMonth() + 1,
                anoAtual: new Date().getFullYear(),
                meses: [],
                anosDisponiveis: [],
                mesAtualNome: '',
            
                error: 'Ocorreu um erro ao carregar os dados financeiros.'
            });
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
    
        // Verifica se o usuário não está logado e redireciona para a página de login
        if (!userId) {
            return res.redirect('/login'); // A execução é interrompida aqui se o redirecionamento ocorrer
        }
    
        // Obtem o ano e o mês, ou usa o ano e mês atual
        let anoAtual = parseInt(req.query.ano) || new Date().getFullYear();
        let mesAtual = parseInt(req.query.mes) || (new Date().getMonth() + 1); // Meses começam de 1 para Janeiro
    
        // Verifica se o usuário quer avançar ou retroceder o mês
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
    
        // Definição dos meses do ano
        const meses = [
            { nome: 'Janeiro', index: 1 }, { nome: 'Fevereiro', index: 2 }, { nome: 'Março', index: 3 }, { nome: 'Abril', index: 4 },
            { nome: 'Maio', index: 5 }, { nome: 'Junho', index: 6 }, { nome: 'Julho', index: 7 }, { nome: 'Agosto', index: 8 },
            { nome: 'Setembro', index: 9 }, { nome: 'Outubro', index: 10 }, { nome: 'Novembro', index: 11 }, { nome: 'Dezembro', index: 12 }
        ];
    
        // Calcula o início e fim do mês
        const inicioMes = new Date(Date.UTC(anoAtual, mesAtual - 1, 1, 0, 0, 0));
        const fimMes = new Date(Date.UTC(anoAtual, mesAtual, 0, 23, 59, 59, 999));
    
        try {
            // Buscar receitas do mês atual
            const receitasMesAtual = await Receita.findAll({
                where: {
                    UserId: userId,
                    date: {
                        [Op.gte]: inicioMes,
                        [Op.lte]: fimMes
                    }
                },
                include: [
                    {
                        model: Categorias, // Inclui os dados da categoria associada
                        attributes: ['name'] // Pega apenas o nome da categoria
                    }
                ],
                raw: true,
                nest: true // Mantém os dados organizados corretamente
            });
    
            // Calcular os totais de receitas
            let totalRecebido = 0, totalPendente = 0, totalMes = 0;
            const hoje = new Date();
    
            receitasMesAtual.forEach(receita => {
                const dataReceita = new Date(receita.date);
                const valorReceita = parseFloat(receita.value) || 0;
    
                // Verifica se a receita já foi recebida ou está pendente
                if (dataReceita <= hoje) {
                    totalRecebido += valorReceita;
                } else {
                    totalPendente += valorReceita;
                }
                totalMes += valorReceita;
            });
    
            // Buscar as finanças pessoais do usuário
            const financaspessoais = await FinancaPessoais.findAll({ where: { UserId: userId }, raw: true });
    
            // Obter o nome do mês atual
            const nomeMesAtual = meses[mesAtual - 1].nome;
    
            // Buscar as categorias de receita para o filtro
            const categorias = await Categorias.findAll({
                attributes: ['id', 'name'],
                where: { tipo: 'receita' }, // Filtra apenas categorias do tipo "receita"
                raw: true
            });
    
            // Passa os dados para a view
            return res.render('financas/viewReceitas', {
                receitas: receitasMesAtual,
                financaspessoais,
                totalRecebido,
                totalPendente,
                totalMes,
                anoAtual,
                mesAtual,
                meses,
                nomeMesAtual,
                categorias // Passa a lista de categorias para a view
            });
    
        } catch (error) {
            // Loga o erro se ocorrer
            console.error('Erro ao carregar as receitas do usuário:', error);
    
            // Em caso de erro, renderiza a página com dados vazios
            return res.render('financas/viewReceitas', {
                receitas: [],
                financaspessoais: [],
                totalRecebido: 0,
                totalPendente: 0,
                totalMes: 0,
                anoAtual,
                mesAtual,
                meses,
                nomeMesAtual: meses[mesAtual - 1].nome,
                categorias: [] // Envia categorias vazias em caso de erro
            });
        }
    }
    
    static async createReceitaSave(req, res) {
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }
    
        const receita = {
            title: req.body.title,
            value: parseFloat(req.body.value),
            date: req.body.date,
            UserId: userId,
            CategoriaId: req.body.CategoriaId
        };
    
        if (isNaN(receita.value) || receita.value <= 0) {
            req.flash('message', 'O valor da receita deve ser um número válido maior que zero');
            return res.redirect('/financas/viewReceitas');
        }
    
        try {
            // Cria a nova receita no banco de dados
            const novaReceita = await Receita.create(receita);
    
            // Verifica se a categoria do usuário já existe na tabela CategoriaUsuario
            let categoriaUsuario = await CategoriaUsuario.findOne({
                where: { UserId: userId, CategoriaId: req.body.CategoriaId }
            });
    
            if (categoriaUsuario) {
                // Se já existe, soma o valor ao totalRecebido diretamente no banco
                await categoriaUsuario.increment('totalRecebido', { by: receita.value });
            } else {
                // Se não existe, cria um novo registro na CategoriaUsuario
                await CategoriaUsuario.create({
                    UserId: userId,
                    CategoriaId: req.body.CategoriaId,
                    totalRecebido: receita.value
                });
            }
    
            // Busca todas as receitas do usuário e calcula o total de receitas
            const todasReceitas = await Receita.findAll({
                where: { UserId: userId },
                attributes: ['value'],
                raw: true
            });
    
            let totalReceitas = todasReceitas.reduce((acc, receita) => acc + (parseFloat(receita.value) || 0), 0);
    
            // Busca ou cria as finanças pessoais do usuário
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
    
            req.session.save(err => {
                if (err) {
                    console.error('Erro ao salvar a sessão:', err);
                    return res.redirect('/financas/viewReceitas');
                }
                return res.redirect('/financas/viewReceitas');
            });
    
        } catch (error) {
            console.log('Aconteceu um erro: ', error);
            req.flash('message', 'Ocorreu um erro ao tentar criar a receita');
            return res.redirect('/financas/viewReceitas');
        }
    }
    
    static async viewDespesas(req, res) {
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login'); // Garantir que o usuário esteja autenticado
        }
    
        // Inicializa ano e mês atuais a partir da query ou usa a data atual
        let anoAtual = parseInt(req.query.ano) || new Date().getFullYear();
        let mesAtual = parseInt(req.query.mes) || (new Date().getMonth() + 1); // Meses começam de 1 (Janeiro)
    
        // Verifica se o usuário quer avançar ou retroceder no mês
        if (req.query.avancar) {
            mesAtual = mesAtual + 1;
            if (mesAtual > 12) {
                mesAtual = 1;
                anoAtual += 1;
            }
        } else if (req.query.retroceder) {
            mesAtual = mesAtual - 1;
            if (mesAtual < 1) {
                mesAtual = 12;
                anoAtual -= 1;
            }
        }
    
        // Array com os nomes dos meses
        const meses = [
            { nome: 'Janeiro', index: 1 }, { nome: 'Fevereiro', index: 2 }, { nome: 'Março', index: 3 }, { nome: 'Abril', index: 4 },
            { nome: 'Maio', index: 5 }, { nome: 'Junho', index: 6 }, { nome: 'Julho', index: 7 }, { nome: 'Agosto', index: 8 },
            { nome: 'Setembro', index: 9 }, { nome: 'Outubro', index: 10 }, { nome: 'Novembro', index: 11 }, { nome: 'Dezembro', index: 12 }
        ];
    
        // Define o início e fim do mês com base no ano e mês selecionado
        const inicioMes = new Date(Date.UTC(anoAtual, mesAtual - 1, 1, 0, 0, 0));
        const fimMes = new Date(Date.UTC(anoAtual, mesAtual, 0, 23, 59, 59, 999));
    
        try {
            // Buscar as despesas do mês atual
            const despesasMesAtual = await Despesas.findAll({
                where: {
                    UserId: userId,
                    date: {
                        [Op.gte]: inicioMes,
                        [Op.lte]: fimMes
                    }
                },
                include: [
                    {
                        model: Categorias, // Inclui a categoria associada
                        attributes: ['name'] // Pega apenas o nome da categoria
                    }
                ],
                raw: true,
                nest: true // Mantém a estrutura organizada para acessar dados de forma eficiente
            });
    
            // Inicializa totais
            let totalPago = 0, totalPendente = 0, totalMes = 0;
            const hoje = new Date();
    
            // Calcula os totais de despesas
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
    
            // Buscar informações financeiras do usuário
            const financaspessoais = await FinancaPessoais.findAll({ where: { UserId: userId }, raw: true });
    
            // Nome do mês atual
            const nomeMesAtual = meses[mesAtual - 1].nome;
    
            // Buscar as categorias de "despesa"
            const categorias = await Categorias.findAll({
                attributes: ['id', 'name'],
                where: { tipo: 'despesa' }, // Filtra apenas categorias do tipo "despesa"
                raw: true
            });
    
            // Renderiza a página com os dados obtidos
            res.render('financas/viewDespesas', {
                despesas: despesasMesAtual,
                financaspessoais,
                totalPago,
                totalPendente,
                totalMes,
                anoAtual,
                mesAtual,
                meses,
                nomeMesAtual,
                categorias
            });
    
        } catch (error) {
            console.error('Erro ao carregar as despesas:', error);
            // Em caso de erro, redireciona para a página de despesas com totais zerados
            return res.render('financas/viewDespesas', {
                totalPago: 0,
                totalPendente: 0,
                totalMes: 0,
                anoAtual,
                mesAtual,
                meses,
                nomeMesAtual: meses[mesAtual - 1].nome,
                categorias: []
            });
        }
    }

    static async createDespesaSave(req, res) {
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }
    
        const despesa = {
            title: req.body.title,
            valor: parseFloat(req.body.valor),
            date: req.body.date,
            UserId: userId,
            CategoriaId: req.body.CategoriaId
        };
    
        if (isNaN(despesa.valor) || despesa.valor <= 0) {
            req.flash('message', 'O valor da despesa deve ser um número válido maior que zero');
            return res.redirect('/financas/viewDespesas');
        }
    
        try {
            // Criar a nova despesa no banco de dados
            const novaDespesa = await Despesas.create(despesa);
    
            // Verifica se a categoria do usuário já existe na tabela CategoriaUsuario
            let categoriaUsuario = await CategoriaUsuario.findOne({
                where: { UserId: userId, CategoriaId: despesa.CategoriaId }
            });
    
            if (categoriaUsuario) {
                // Se já existe, soma o valor ao totalGasto diretamente no banco
                await categoriaUsuario.increment('totalDespesas', { by: despesa.valor });
            } else {
                // Se não existe, cria um novo registro na CategoriaUsuario
                await CategoriaUsuario.create({
                    UserId: userId,
                    CategoriaId: despesa.CategoriaId,
                    totalDespesas: despesa.valor
                });
            }
    
            // Buscar todas as despesas do usuário e calcular o total de despesas
            const todasDespesas = await Despesas.findAll({
                where: { UserId: userId },
                attributes: ['valor'],
                raw: true
            });
    
            let totalDespesas = todasDespesas.reduce((acc, despesa) => acc + (parseFloat(despesa.valor) || 0), 0);
    
            // Buscar ou criar as finanças pessoais do usuário
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
    
            req.session.save(err => {
                if (err) {
                    console.error('Erro ao salvar a sessão:', err);
                    return res.redirect('/financas/viewDespesas');
                }
                return res.redirect('/financas/viewDespesas');
            });
    
        } catch (error) {
            console.log('Aconteceu um erro: ', error);
            req.flash('message', 'Ocorreu um erro ao tentar criar a despesa');
            return res.redirect('/financas/viewDespesas');
        }
    }
    
    
    
    static async viewCartaos(req, res) {
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }
    
        try {
            const cartaos = await Cartao.findAll({
                where: { UserId: userId },
                raw: true
            });
    
            const dias = Array.from({ length: 31 }, (_, i) => i + 1);
            const now = new Date();
            const anoAtual = now.getFullYear();
            const mesAtual = now.getMonth() + 1;
    
            // Pega mês e ano da URL ou usa os atuais
            const mesSelecionado = parseInt(req.query.mes) || mesAtual;
            const anoSelecionado = parseInt(req.query.ano) || anoAtual;
            const filtroManual = req.query.mes && req.query.ano;

            const cartaosProcessados = [];
    
            for (const cartao of cartaos) {
                let mesFatura = mesSelecionado;
                let anoFatura = anoSelecionado;
    
                let faturaAtual = await Fatura.findOne({
                    where: { CartaoId: cartao.id, mes: mesFatura, ano: anoFatura },
                    raw: true
                });
    
                let tentativa = 0;
                if (!filtroManual) {
                    while (faturaAtual && faturaAtual.status === "Paga" && tentativa < 12) {
                        if (mesFatura === 12) {
                            mesFatura = 1;
                            anoFatura++;
                        } else {
                            mesFatura++;
                        }
        
                        faturaAtual = await Fatura.findOne({
                            where: { CartaoId: cartao.id, mes: mesFatura, ano: anoFatura },
                            raw: true
                        });
        
                        tentativa++;
                    }
        
                }
              
                let statusFatura = faturaAtual ? faturaAtual.status : "Sem Fatura";
                
                if (!filtroManual && statusFatura === "Paga") {
                    statusFatura = "Sem Fatura";
                }
                
                let percentUso = cartao.limite_total > 0
                    ? Math.round((1 - (cartao.limite_disponivel || cartao.limite_total) / cartao.limite_total) * 100)
                    : 0;
                if (percentUso < 0) percentUso = 0;
    
                if (!faturaAtual) {
                    faturaAtual = { valor_total: 0, status: "Sem Fatura" };
                }
                faturaAtual.statusExibicao = statusFatura;
    
                const hoje = new Date();
                const dataFechamento = new Date(anoFatura, mesFatura - 1, cartao.dataFechamento);
                const exibirBotaoPagar = faturaAtual.status === "Aberta" && hoje >= dataFechamento;
    
                cartaosProcessados.push({
                    ...cartao,
                    faturaAtual,
                    percentUso,
                    percentUsoFormatado: `${percentUso}%`,
                    statusFatura,
                    mesAtual: mesFatura,
                    anoAtual: anoFatura,
                    exibirBotaoPagar
                });
            }
    
            const categorias = await Categorias.findAll({
                where: { tipo: 'despesa' },
                attributes: ['id', 'name'],
                raw: true
            });
    
            const meses = [
                { valor: 1, nome: "Janeiro" },
                { valor: 2, nome: "Fevereiro" },
                { valor: 3, nome: "Março" },
                { valor: 4, nome: "Abril" },
                { valor: 5, nome: "Maio" },
                { valor: 6, nome: "Junho" },
                { valor: 7, nome: "Julho" },
                { valor: 8, nome: "Agosto" },
                { valor: 9, nome: "Setembro" },
                { valor: 10, nome: "Outubro" },
                { valor: 11, nome: "Novembro" },
                { valor: 12, nome: "Dezembro" }
            ];
    
            return res.render('financas/viewCartaos', {
                cartaos: cartaosProcessados,
                dias,
                categorias,
                dataHoje: new Date().toISOString().split('T')[0],
                messages: {
                    message: req.flash('message')[0],  // Passa a mensagem aqui
                    error: req.flash('error')[0]       // Passa o erro também, se necessário
                },
                meses,
                mesSelecionado,
                anoSelecionado
            });
    
        } catch (error) {
            console.error('Erro ao carregar os cartões:', error);
            req.flash('message', 'Erro ao carregar seus cartões. Tente novamente mais tarde.');
            req.flash('error', true);
            return res.redirect('/financas/dashboard');
        }
    }
    

   static async createCartaoSave(req, res) {

        const { name, limite_total, dataFechamento, datavence } = req.body;
        const userId = req.session.userid;

        // Converter para números inteiros para garantir valores válidos
        const diaFechamento = parseInt(dataFechamento);
        const diaVencimento = parseInt(datavence);
        const limite = parseFloat(limite_total);

        // Verificar se os valores são números válidos
        if (isNaN(diaFechamento) || isNaN(diaVencimento) || isNaN(limite)) {
            req.flash('message', 'Os valores informados são inválidos.');
            return req.session.save(() => res.redirect('/financas/viewCartaos'));
        }

        // Validação das datas considerando o ciclo mensal do cartão
        if (diaFechamento === diaVencimento) {
            req.flash('message', 'A data de vencimento não pode ser no mesmo dia do fechamento.');
            return req.session.save(() => res.redirect('/financas/viewCartaos'));
        }

        try {
            // Criar o cartão
            const novoCartao = await Cartao.create({
                name,
                limite_total: limite,
                limite_disponivel: limite, // Começa com o mesmo valor do limite total
                dataFechamento: diaFechamento,
                datavence: diaVencimento,
                UserId: userId
            });

            // Obter a data atual
            const hoje = new Date();
            const diaAtual = hoje.getDate();
            const mesAtual = hoje.getMonth() + 1; // Meses começam em 0
            const anoAtual = hoje.getFullYear();

            // Verificar se o fechamento é hoje
            if (diaFechamento <= diaAtual) {
                console.log(`Fechamento da fatura é hoje (${diaFechamento}). Criando fatura para o próximo mês.`);

                // Fechar a fatura do mês atual
                await Fatura.create({
                    CartaoId: novoCartao.id,
                    mes: mesAtual,
                    ano: anoAtual,
                    valor_total: 0,
                    status: 'Paga'
                });

                // Criar a fatura para o próximo mês
                const proximoMes = mesAtual === 12 ? 1 : mesAtual + 1;
                const proximoAno = mesAtual === 12 ? anoAtual + 1 : anoAtual;

                await Fatura.create({
                    CartaoId: novoCartao.id,
                    mes: proximoMes,
                    ano: proximoAno,
                    valor_total: 0,
                    status: 'Aberta'
                });
            } else {
                console.log(`Fechamento da fatura ainda não ocorreu (${diaFechamento}). Criando fatura para o mês atual.`);

                // Criar a fatura para o mês atual
                await Fatura.create({
                    CartaoId: novoCartao.id,
                    mes: mesAtual,
                    ano: anoAtual,
                    valor_total: 0,
                    status: 'Aberta'
                });
            }

            req.flash('message', 'Cartão criado com sucesso!');
            req.session.save(() => res.redirect('/financas/viewCartaos'));
        } catch (error) {
            console.error('Erro ao criar cartão:', error);
            req.flash('message', 'Erro ao criar cartão. Tente novamente.');
            req.session.save(() => res.redirect('/financas/viewCartaos'));
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
    
            let receitaValor = parseFloat(receita.value) || 0;
    
            // Buscar as finanças do usuário
            let financas = await FinancaPessoais.findOne({ where: { UserId: UserId } });
    
            if (financas) {
                let saldoAtual = parseFloat(financas.saldo) || 0;
                let totalReceitas = parseFloat(financas.totalReceitas) || 0;
    
                // Atualiza saldo e total de receitas
                financas.saldo = saldoAtual - receitaValor;
                financas.totalReceitas = totalReceitas - receitaValor;
                await financas.save();
            }
    
            // Atualizar ou remover a categoria do usuário
            let categoriaUsuario = await CategoriaUsuario.findOne({
                where: { UserId: UserId, CategoriaId: receita.CategoriaId }
            });
    
            if (categoriaUsuario) {
                let novoTotal = parseFloat(categoriaUsuario.totalRecebido) - receitaValor;
    
                if (novoTotal > 0) {
                    // Apenas atualiza se ainda houver valor na categoria
                    categoriaUsuario.totalRecebido = novoTotal;
                    await categoriaUsuario.save();
                } else {
                    // Se o totalRecebido for zero ou menor, remove a categoria do usuário
                    await CategoriaUsuario.destroy({
                        where: { UserId: UserId, CategoriaId: receita.CategoriaId }
                    });
                }
            }
    
            // Agora, remover a receita
            const deleted = await Receita.destroy({ where: { id: id, UserId: UserId } });
    
            if (!deleted) {
                req.flash('error', 'Erro ao remover a receita.');
                return res.redirect('/financas/viewReceitas');
            }
    
            req.flash('message', 'Receita removida com sucesso!');
            req.session.save(() => {
                return res.redirect('/financas/viewReceitas');
            });
    
        } catch (error) {
            console.log(`Aconteceu um erro: `, error);
            req.flash('error', 'Erro ao tentar remover a receita!');
            return res.redirect('/financas/viewReceitas');
        }
    }
    
    static async removeDespesa(req, res) {
        const id = req.body.id;
        const UserId = req.session.userid;
    
        try {
            // Buscar a despesa antes de remover
            const despesa = await Despesas.findOne({ where: { id: id, UserId: UserId } });
    
            if (!despesa) {
                req.flash('error', 'Despesa não encontrada!');
                return res.redirect('/financas/viewDespesas');
            }
    
            let despesaValor = parseFloat(despesa.valor) || 0;
    
            // Buscar as finanças do usuário
            let financas = await FinancaPessoais.findOne({ where: { UserId: UserId } });
    
            if (financas) {
                let saldoAtual = parseFloat(financas.saldo) || 0;
                let totalDespesas = parseFloat(financas.totalDespesas) || 0;
    
                // Atualiza saldo e total de despesas
                financas.saldo = saldoAtual + despesaValor;
                financas.totalDespesas = totalDespesas - despesaValor;
                await financas.save();
            }
    
            // Atualizar ou remover a categoria do usuário
            let categoriaUsuario = await CategoriaUsuario.findOne({
                where: { UserId: UserId, CategoriaId: despesa.CategoriaId }
            });
    
            if (categoriaUsuario) {
                let novoTotal = parseFloat(categoriaUsuario.totalDespesas) - despesaValor;
    
                if (novoTotal > 0) {
                    // Apenas atualiza se ainda houver valor na categoria
                    categoriaUsuario.totalDespesas = novoTotal;
                    await categoriaUsuario.save();
                } else {
                    // Se o totalGasto for zero ou menor, remove a categoria do usuário
                    await CategoriaUsuario.destroy({
                        where: { UserId: UserId, CategoriaId: despesa.CategoriaId }
                    });
                }
            }
    
            // Agora, remover a despesa
            const deleted = await Despesas.destroy({ where: { id: id, UserId: UserId } });
    
            if (!deleted) {
                req.flash('error', 'Erro ao remover a despesa.');
                return res.redirect('/financas/viewDespesas');
            }
    
            req.flash('message', 'Despesa removida com sucesso!');
            req.session.save(() => {
                return res.redirect('/financas/viewDespesas');
            });
    
        } catch (error) {
            console.log(`Aconteceu um erro: `, error);
            req.flash('error', 'Erro ao tentar remover a despesa!');
            return res.redirect('/financas/viewDespesas');
        }
    }
    
    static async removeCartao(req,res){

        const id = req.body.id
        const UserId = req.session.userid

        try{
            await Cartao.destroy({where:{id:id,UserId:UserId}})
            req.session.save(()=>{
                return res.redirect('/financas/viewCartaos')
            })
        }catch(error){
            console.log(`aconteceu um erro` + error)
        }
        
    }

    static async updateReceitaSave(req, res) {
        try {
            const id = req.body.id;
            const valor = parseFloat(req.body.value);
            
            if (isNaN(valor) || valor < 0) {
                req.flash('message', 'Valor inválido para a receita');
                return res.redirect('/financas/viewReceitas');
            }
    
            const receita = {
                title: req.body.title,
                value: valor,
                date: req.body.date,
                CategoriaId: req.body.CategoriaId
            };
    
            const receitaAtual = await Receita.findOne({ where: { id } });
            if (!receitaAtual) {
                req.flash('message', 'Receita não encontrada');
                return res.redirect('/financas/viewReceitas');
            }
    
            const userId = receitaAtual.UserId;
            const valorAntigo = parseFloat(receitaAtual.value) || 0;
            const novoValor = receita.value;
            const categoriaAntigaId = receitaAtual.CategoriaId;
            const categoriaNovaId = receita.CategoriaId;
    
            const t = await sequelize.transaction();
    
            try {
                await Receita.update(receita, { where: { id }, transaction: t });
    
                let financas = await FinancaPessoais.findOne({ 
                    where: { UserId: userId },
                    transaction: t 
                });
    
                if (financas) {
                    financas.totalReceitas = parseFloat(financas.totalReceitas) - valorAntigo + novoValor;
                    financas.saldo = parseFloat(financas.saldo) - valorAntigo + novoValor;
                    await financas.save({ transaction: t });
                }
    
                if (categoriaAntigaId !== categoriaNovaId) {
                    const receitasAntigas = await Receita.findAll({
                        where: { CategoriaId: categoriaAntigaId, UserId: userId },
                        transaction: t
                    });
    
                    const totalAntigo = receitasAntigas.reduce((acc, rec) => acc + parseFloat(rec.value), 0);
    
                    if (totalAntigo > 0) {
                        await CategoriaUsuario.update({
                            totalRecebido: totalAntigo
                        }, {
                            where: { CategoriaId: categoriaAntigaId, UserId: userId },
                            transaction: t
                        });
                    } else {
                        await CategoriaUsuario.destroy({
                            where: { CategoriaId: categoriaAntigaId, UserId: userId },
                            transaction: t
                        });
                    }
                }
    
                const receitasNovas = await Receita.findAll({
                    where: { CategoriaId: categoriaNovaId, UserId: userId },
                    transaction: t
                });
    
                const totalNovo = receitasNovas.reduce((acc, rec) => acc + parseFloat(rec.value), 0);
    
                await CategoriaUsuario.upsert({
                    UserId: userId,
                    CategoriaId: categoriaNovaId,
                    totalRecebido: totalNovo
                }, { transaction: t });
    
                await t.commit();
    
                req.flash('message', 'Receita atualizada com sucesso');
                req.session.save(() => {
                    return res.redirect('/financas/viewReceitas');
                });
            } catch (err) {
                await t.rollback();
                throw err;
            }
        } catch (err) {
            console.error('Erro ao atualizar receita:', err);
            req.flash('message', 'Erro ao atualizar receita. Por favor, tente novamente.');
            return res.redirect('/financas/viewReceitas');
        }
    }
    
   // Método para atualizar uma despesa existente
    static async updateDespesaSave(req, res) {
        try {
            // Pega o ID da despesa que será atualizada
            const id = req.body.id;

            // Valida se o valor é um número válido e positivo
            const valor = parseFloat(req.body.valor);
            if (isNaN(valor) || valor < 0) {
                req.flash('message', 'Valor inválido para a despesa');
                return res.redirect('/financas/viewDespesas');
            }

            // Cria o objeto com os dados da despesa
            const despesa = {
                title: req.body.title,
                valor: valor,
                date: req.body.date,
                CategoriaId: req.body.CategoriaId
            };

            // Busca a despesa atual no banco
            const despesaAtual = await Despesas.findOne({ where: { id } });
            if (!despesaAtual) {
                req.flash('message', 'Despesa não encontrada');
                return res.redirect('/financas/viewDespesas');
            }

            // Guarda as informações importantes
            const userId = despesaAtual.UserId;
            const valorAntigo = parseFloat(despesaAtual.valor) || 0;
            const novoValor = despesa.valor;
            const categoriaAntigaId = despesaAtual.CategoriaId;
            const categoriaNovaId = despesa.CategoriaId;

            // Inicia uma transação para garantir que todas as operações sejam feitas juntas
            const t = await sequelize.transaction();

            try {
                // 1. Atualiza a despesa
                await Despesas.update(despesa, { 
                    where: { id },
                    transaction: t
                });

                // 2. Atualiza as finanças do usuário
                let financas = await FinancaPessoais.findOne({ 
                    where: { UserId: userId },
                    transaction: t
                });

                if (financas) {
                    // Atualiza total de despesas primeiro removendo o valor antigo e adicionando o novo
                    financas.totalDespesas = parseFloat(financas.totalDespesas) - parseFloat(valorAntigo) + parseFloat(novoValor);

                    // Atualiza o saldo baseado na diferença
                    const diferenca = parseFloat(novoValor) - parseFloat(valorAntigo);
                    financas.saldo = parseFloat(financas.saldo) - diferenca;

                    await financas.save({ transaction: t });
                }

               // Atualizar a categoria antiga (se mudou de categoria)
            if (categoriaAntigaId !== categoriaNovaId) {
                const despesasAntigas = await Despesas.findAll({
                    where: { 
                        CategoriaId: categoriaAntigaId,
                        UserId: userId 
                    },
                    transaction: t
                });

                const totalAntigo = despesasAntigas.reduce((acc, desp) => acc + parseFloat(desp.valor), 0);

                if (totalAntigo > 0) {
                    await CategoriaUsuario.update({
                        totalDespesas: totalAntigo
                    }, {
                        where: { 
                            CategoriaId: categoriaAntigaId,
                            UserId: userId
                        },
                        transaction: t
                    });
                } else {
                    await CategoriaUsuario.destroy({ 
                        where: { 
                            CategoriaId: categoriaAntigaId,
                            UserId: userId
                        },
                        transaction: t 
                    });
                }
            }

            // Atualizar a nova categoria
            const despesasNovas = await Despesas.findAll({
                where: { 
                    CategoriaId: categoriaNovaId,
                    UserId: userId
                },
                transaction: t
            });

            const totalNovo = despesasNovas.reduce((acc, desp) => acc + parseFloat(desp.valor), 0);

            await CategoriaUsuario.upsert({
                UserId: userId,
                CategoriaId: categoriaNovaId,
                totalDespesas: totalNovo
            }, { 
                transaction: t 
            });

                // Confirma todas as alterações
                await t.commit();

                // Redireciona com mensagem de sucesso
                req.flash('message', 'Despesa atualizada com sucesso');
                req.session.save(() => {
                    return res.redirect('/financas/viewDespesas');
                });

            } catch (err) {
                // Se der erro, desfaz todas as alterações
                await t.rollback();
                throw err;
            }

        } catch (err) {
            console.error('Erro ao atualizar despesa:', err);
            req.flash('message', 'Erro ao atualizar despesa. Por favor, tente novamente.');
            return res.redirect('/financas/viewDespesas');
        }
    }
    
    static async updateCartaoSave(req, res) {
        const { id, name, limite_total, dataFechamento, datavence } = req.body;
    
        // Converter para objetos Date para comparação
        const fechamento = new Date(dataFechamento);
        const vencimento = new Date(datavence);
    
        // Validação das datas
        if (vencimento <= fechamento) {
            req.flash('message', 'A data de vencimento deve ser maior que a data de fechamento.');
            return req.session.save(() => {
                return res.redirect('/financas/viewCartaos'); // Garante que a mensagem de erro seja exibida
            });
        }
    
        const cartao = {
            name,
            limite_total,
            dataFechamento,
            datavence,
            UserId: req.session.userid
        };
    
        try {
            await Cartao.update(cartao, { where: { id: id } });
    
            req.flash('message', 'Cartão atualizado com sucesso');
            req.session.save(() => {
                return res.redirect('/financas/viewCartaos');
            });
        } catch (err) {
            console.log(err);
        }
    }
  
    
}