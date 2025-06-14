const FinancaPessoais = require('../models/FinancaPessoais')
const User = require('../models/User')
const Despesas = require('../models/Despesas')
const Cartao = require('../models/Cartao')
const DespesaCartao = require('../models/DespesaCartao')
const Fatura = require('../models/Fatura')
const Receita = require('../models/Receita')
const Categorias = require('../models/Categorias')
const CategoriaUsuario = require('../models/CategoriaUsuario')
const { Op, literal } = require('sequelize'); // Certifique-se de importar o operador Op e literal no topo do arquivo
const sequelize = require('../db/conn') // Importa a instância do sequelize já configurada
const atualizarSaldo = require('../helpers/atualizarSaldo') // Importa a função de atualização de saldo
const converterDataParaISO = require('../helpers/converter'); // Ajuste o caminho conforme necessário
const processarPendentes = require('../helpers/processarPendentes');
const calcularSaldoPorMes = require('../helpers/calcularSaldoPorMes');




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
        // Processar receitas e despesas pendentes
        await processarPendentes(userId);
        
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

            const mesSelecionado = parseInt(req.query.mes) || (new Date().getMonth() + 1); // pega mês da query ou o mês atual

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
                        literal(`EXTRACT(YEAR FROM "date") = ${anoAtual}`),
                        literal(`EXTRACT(MONTH FROM "date") = ${mesAtual}`)
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
                        literal(`EXTRACT(YEAR FROM "date") = ${anoAtual}`),
                        literal(`EXTRACT(MONTH FROM "date") = ${mesAtual}`)
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
            ] // Filtrar apenas itens com valor maior que zero

            console.log('Dados do gráfico geral:', graficoGeral);

            // Buscar o saldo diretamente da tabela FinancaPessoais
            const financas = await FinancaPessoais.findOne({ where: { UserId: userId } });
    
            // Garantir que o saldo seja um número válido
            const saldo = financas ? parseFloat(financas.saldo) || 0 : 0;
    
           
    

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
            
            const saldoPorMes = await calcularSaldoPorMes(userId, anoAtual, mesAtual);
            const saldoInicial = saldoPorMes.saldoAnterior;
            const saldoPrevisto = saldoPorMes.saldoPrevisto;

            // Passar o link selecionado para a view
            return res.render('financas/dashboard', {
                totalReceitas: totalReceitas.toFixed(2),
                totalDespesas: totalDespesas.toFixed(2),
                totalCartao: totalCartao.toFixed(2),
                saldo: saldo.toFixed(2),
                despesas: JSON.stringify(despesas),
                receitas: JSON.stringify(receitas),
                cartoes: JSON.stringify(cartoesCategorias),
                graficoGeral: JSON.stringify(graficoGeral),
                mesAtual,
                anoAtual,
                meses,
                anosDisponiveis,
                mesAtualNome: meses.find(m => m.valor === mesAtual).nome,
                linkExibido,
                saldoInicial: saldoInicial,
                saldoPrevisto,
                mes: mesSelecionado,
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
    
  static async viewSaldo(req, res) {
    const userId = req.session.userid;

    if (!userId) {
        return res.redirect('/login');
    }

    try {
        // Obter o registro financeiro do usuário
        const financa = await FinancaPessoais.findOne({ 
            where: { UserId: userId }
        });

        console.log('Debug - Registro financeiro encontrado:', financa);
        
        // Valores padrão se não houver registros
        let saldo = 0;
        let totalReceitas = 0;
        let totalDespesas = 0;
        
        // Se encontrou dados financeiros, extrair valores de forma segura
        if (financa) {
            // Usar Number() para garantir conversão de decimal para número
            saldo = Number(financa.saldo || 0);
            totalReceitas = Number(financa.totalReceitas || 0);
            totalDespesas = Number(financa.totalDespesas || 0);
        }
        
        // Calcular receitas futuras (não processadas)
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Início do dia atual
        
        // Obter a soma das receitas futuras
        const resultadoReceitas = await Receita.findAll({
            attributes: [
                [sequelize.fn('SUM', sequelize.col('value')), 'total']
            ],
            where: {
                UserId: userId,
                foiProcessada: false,
                [Op.and]: [
                    literal(`EXTRACT(YEAR FROM "date") >= ${hoje.getFullYear()}`),
                    literal(`EXTRACT(MONTH FROM "date") >= ${hoje.getMonth() + 1}`)
                ]
            },
            raw: true
        });
        
        console.log('Debug - Resultado receitas futuras:', resultadoReceitas);
        
        // Obter a soma das despesas futuras
        const resultadoDespesas = await Despesas.findAll({
            attributes: [
                [sequelize.fn('SUM', sequelize.col('valor')), 'total']
            ],
            where: {
                UserId: userId,
                foiProcessada: false,
                [Op.and]: [
                    literal(`EXTRACT(YEAR FROM "date") >= ${hoje.getFullYear()}`),
                    literal(`EXTRACT(MONTH FROM "date") >= ${hoje.getMonth() + 1}`)
                ]
            },
            raw: true
        });
        
        console.log('Debug - Resultado despesas futuras:', resultadoDespesas);
        
        // Extrair os valores de forma segura
        const receitasFuturas = Number(resultadoReceitas[0]?.total || 0);
        const despesasFuturas = Number(resultadoDespesas[0]?.total || 0);
        
        console.log('Debug - Receitas futuras:', receitasFuturas);
        console.log('Debug - Despesas futuras:', despesasFuturas);
        
        // Calcular saldo previsto e balanço
        const saldoPrevisto = saldo + receitasFuturas - despesasFuturas;
        const balanco = totalReceitas - totalDespesas;
        
        console.log('Debug - Valores finais:');
        console.log('Saldo:', saldo);
        console.log('Receitas Futuras:', receitasFuturas);
        console.log('Despesas Futuras:', despesasFuturas);
        console.log('Saldo Previsto:', saldoPrevisto);
        console.log('Total Receitas:', totalReceitas);
        console.log('Total Despesas:', totalDespesas);
        console.log('Balanço:', balanco);
        
        // Formatar todos os valores para exibição com 2 casas decimais
        const formatarMoeda = valor => {
            return (Math.round(valor * 100) / 100).toFixed(2);
        };
        
        // Renderizar a página com os dados formatados
        return res.render('financas/saldo', {
            saldo: formatarMoeda(saldo),
            saldoPrevisto: formatarMoeda(saldoPrevisto),
            totalReceitas: formatarMoeda(totalReceitas),
            totalDespesas: formatarMoeda(totalDespesas),
            balanco: formatarMoeda(balanco)
        });
    } catch (error) {
        console.error('Erro ao carregar o saldo:', error);
        // Renderizar página com valores zerados em caso de erro
        return res.render('financas/saldo', {
            saldo: "0.00",
            saldoPrevisto: "0.00",
            totalReceitas: "0.00",
            totalDespesas: "0.00",
            balanco: "0.00"
        });
    }
}

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
                categorias, // Passa a lista de categorias para a view
                messages: res.locals.messages 
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
    
        // Converte a data do formato brasileiro para ISO
        const dataISO = converterDataParaISO(req.body.date);
    
        const receita = {
            title: req.body.title,
            value: parseFloat(req.body.value),
            date: new Date(dataISO), // Converte para um objeto Date
            UserId: userId,
            CategoriaId: req.body.CategoriaId,
            foiProcessada: false // Inicialmente, a receita não foi processada
        };
    
        if (isNaN(receita.value) || receita.value <= 0) {
            req.flash('message', 'O valor da receita deve ser um número válido maior que zero');
            return res.redirect('/financas/viewReceitas');
        }
    
        try {
            // Cria a nova receita no banco de dados
            const novaReceita = await Receita.create(receita);
    
            // Atualiza ou cria a categoria do usuário
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
    
            // Verifica se o mês da receita já chegou
            const hoje = new Date();
            const mesAtual = hoje.getMonth() + 1; // Meses começam em 0
            const anoAtual = hoje.getFullYear();
    
            const dataReceita = new Date(dataISO);
            const mesReceita = dataReceita.getMonth() + 1;
            const anoReceita = dataReceita.getFullYear();
    
            if (anoReceita < anoAtual || (anoReceita === anoAtual && mesReceita <= mesAtual)) {
                // Atualiza o saldo imediatamente se o mês já chegou
                await atualizarSaldo(userId, receita.value, 'receita');
    
                // Marca a receita como processada
                novaReceita.foiProcessada = true;
                await novaReceita.save();
            } else {
                console.log('A receita foi salva, mas o saldo será atualizado apenas no mês da receita.');
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
                categorias,
                messages: res.locals.messages 
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
    
        // Converte a data do formato brasileiro para ISO
        const dataISO = converterDataParaISO(req.body.date);
    
        const despesa = {
            title: req.body.title,
            valor: parseFloat(req.body.valor),
            date: new Date(dataISO), // Converte para um objeto Date
            UserId: userId,
            CategoriaId: req.body.CategoriaId,
            foiProcessada: false // Inicialmente, a despesa não foi processada
        };
    
        if (isNaN(despesa.valor) || despesa.valor <= 0) {
            req.flash('message', 'O valor da despesa deve ser um número válido maior que zero');
            return res.redirect('/financas/viewDespesas');
        }
    
        try {
            // Criar a nova despesa no banco de dados
            const novaDespesa = await Despesas.create(despesa);
    
            // Atualiza ou cria a categoria do usuário
            let categoriaUsuario = await CategoriaUsuario.findOne({
                where: { UserId: userId, CategoriaId: despesa.CategoriaId }
            });
    
            if (categoriaUsuario) {
                // Se já existe, soma o valor ao totalDespesas diretamente no banco
                await categoriaUsuario.increment('totalDespesas', { by: despesa.valor });
            } else {
                // Se não existe, cria um novo registro na CategoriaUsuario
                await CategoriaUsuario.create({
                    UserId: userId,
                    CategoriaId: despesa.CategoriaId,
                    totalDespesas: despesa.valor
                });
            }
    
            // Verifica se o mês da despesa já chegou
            const hoje = new Date();
            const mesAtual = hoje.getMonth() + 1; // Meses começam em 0
            const anoAtual = hoje.getFullYear();
    
            const dataDespesa = new Date(dataISO);
            const mesDespesa = dataDespesa.getMonth() + 1;
            const anoDespesa = dataDespesa.getFullYear();
    
            if (anoDespesa < anoAtual || (anoDespesa === anoAtual && mesDespesa <= mesAtual)) {
                // Atualiza o saldo imediatamente se o mês já chegou
                await atualizarSaldo(userId, despesa.valor, 'despesa');
    
                // Marca a despesa como processada
                novaDespesa.foiProcessada = true;
                await novaDespesa.save();
            } else {
                console.log('A despesa foi salva, mas o saldo será atualizado apenas no mês da despesa.');
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
                dataHoje: new Date().toISOString().split('T'),
                messages: res.locals.messages ,
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

    static async updateCartaoSave(req, res) {
        const { id, ...dados } = req.body;
        const UserId = req.session.userid;
    
        if (!UserId) {
            return res.redirect('/login');
        }
    
        try {
            console.log('Iniciando updateCartaoSave com dados:', dados);
            
            // Buscar o cartão
            const cartao = await Cartao.findOne({ where: { id, UserId } });
            if (!cartao) {
                // Ainda usamos req.flash, mas forçamos o salvamento da sessão
                req.flash('error', 'Cartão não encontrado!');
                return req.session.save(() => {
                    res.redirect('/financas/viewCartaos');
                });
            }
            
            const hoje = new Date();
            const diaAtual = hoje.getDate();
            
            // Validações específicas para cartão
            if (dados.limite_total) {
                // Verificar se o novo limite é menor que a fatura atual
                const faturaAtual = await Fatura.findOne({
                    where: { 
                        CartaoId: id,
                        status: ['Aberta', 'Fechada'] // Faturas não pagas
                    },
                    order: [['valor_total', 'DESC']] // Pegar a maior fatura
                });
                
                if (faturaAtual && parseFloat(dados.limite_total) < parseFloat(faturaAtual.valor_total)) {
                    req.flash('error', 'O limite não pode ser menor que o valor da fatura atual!');
                    return req.session.save(() => {
                        res.redirect('/financas/viewCartaos');
                    });
                }
            }
            
            // Validar fechamento e vencimento
            if (dados.datavence && dados.dataFechamento) {
                const vencimento = parseInt(dados.datavence);
                const fechamento = parseInt(dados.dataFechamento);
                
                // Validação 1: Vencimento não pode ser menor que a data atual
                if (vencimento < diaAtual) {
                    req.flash('error', 'O vencimento não pode ser menor que a data atual!');
                    return req.session.save(() => {
                        res.redirect('/financas/viewCartaos');
                    });
                }
                
                // Validação 2: Vencimento não pode ser igual ao fechamento
                if (vencimento === fechamento) {
                    req.flash('error', 'O vencimento não pode ser igual ao fechamento!');
                    return req.session.save(() => {
                        res.redirect('/financas/viewCartaos');
                    });
                }
                
                // Validação 3: Fechamento deve ser no máximo 7 dias antes do vencimento
                let diferenca;
                
                if (vencimento > fechamento) {
                    // Se o vencimento é depois do fechamento no mesmo mês
                    diferenca = vencimento - fechamento;
                } else {
                    // Se o vencimento é no mês seguinte ao fechamento
                    diferenca = vencimento + (30 - fechamento);
                }
                
                if (diferenca > 7) {
                    req.flash('error', 'O fechamento deve ser no máximo 7 dias antes do vencimento!');
                    return req.session.save(() => {
                        res.redirect('/financas/viewCartaos');
                    });
                }
            }
            
            // Atualizar o cartão
            await Cartao.update(dados, { where: { id, UserId } });
            
            req.flash('message', 'Cartão atualizado com sucesso!');
            return req.session.save(() => {
                res.redirect('/financas/viewCartaos');
            });
        } catch (error) {
            console.error('Erro ao atualizar cartão:', error);
            req.flash('error', `Ocorreu um erro: ${error.message}`);
            return req.session.save(() => {
                res.redirect('/financas/viewCartaos');
            });
        }
    }

    static async removeItem(req, res) {
        const { id, tipo } = req.body; // `tipo` pode ser 'receita', 'despesa' ou 'cartao'
        const UserId = req.session.userid;
    
        if (!UserId) {
            return res.redirect('/login');
        }
    
        try {
            let item, valor, categoriaId, dataItem;
    
            // Identificar o tipo de item e buscar no banco
            if (tipo === 'receita') {
                item = await Receita.findOne({ where: { id, UserId } });
                if (!item) {
                    req.flash('error', 'Receita não encontrada!');
                    return res.redirect('/financas/viewReceitas');
                }
                valor = parseFloat(item.value) || 0;
                categoriaId = item.CategoriaId;
                dataItem = new Date(item.date);
            } else if (tipo === 'despesa') {
                item = await Despesas.findOne({ where: { id, UserId } });
                if (!item) {
                    req.flash('error', 'Despesa não encontrada!');
                    return res.redirect('/financas/viewDespesas');
                }
                valor = parseFloat(item.valor) || 0;
                categoriaId = item.CategoriaId;
                dataItem = new Date(item.date);
            } else if (tipo === 'cartao') {
                item = await Cartao.findOne({ where: { id, UserId } });
                if (!item) {
                    req.flash('error', 'Cartão não encontrado!');
                    return res.redirect('/financas/viewCartaos');
                }
            } else {
                req.flash('error', 'Tipo inválido!');
                return res.redirect('/financas/dashboard');
            }
    
            // Atualizar saldo apenas se for receita ou despesa e a data já tiver chegado
            if (tipo === 'receita' || tipo === 'despesa') {
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas a data
    
                if (dataItem <= hoje) {
                    const financas = await FinancaPessoais.findOne({ where: { UserId } });
                    if (financas) {
                        const saldoAtual = parseFloat(financas.saldo) || 0;
                        const totalReceitas = parseFloat(financas.totalReceitas) || 0;
                        const totalDespesas = parseFloat(financas.totalDespesas) || 0;
    
                        if (tipo === 'receita') {
                            financas.saldo = saldoAtual - valor; // Subtrai o valor da receita do saldo
                            financas.totalReceitas = totalReceitas - valor; // Atualiza o total de receitas
                        } else if (tipo === 'despesa') {
                            financas.saldo = saldoAtual + valor; // Adiciona o valor da despesa de volta ao saldo
                            financas.totalDespesas = totalDespesas - valor; // Atualiza o total de despesas
                        }
                        await financas.save();
                    }
                }
    
                // Atualizar ou remover a categoria do usuário
                const categoriaUsuario = await CategoriaUsuario.findOne({
                    where: { UserId, CategoriaId: categoriaId }
                });
    
                if (categoriaUsuario) {
                    if (tipo === 'receita') {
                        categoriaUsuario.totalRecebido -= valor;
                    } else if (tipo === 'despesa') {
                        categoriaUsuario.totalDespesas -= valor;
                    }
    
                    if ((categoriaUsuario.totalRecebido || 0) <= 0 && (categoriaUsuario.totalDespesas || 0) <= 0) {
                        await CategoriaUsuario.destroy({ where: { UserId, CategoriaId: categoriaId } });
                    } else {
                        await categoriaUsuario.save();
                    }
                }
            }
    
            // Remover o item
            if (tipo === 'cartao') {
                // Remover faturas e despesas associadas ao cartão
                const faturas = await Fatura.findAll({ where: { CartaoId: id } });
                for (const fatura of faturas) {
                    await DespesaCartao.destroy({ where: { FaturaId: fatura.id } });
                }
                await Fatura.destroy({ where: { CartaoId: id } });

                // Remover o registro na tabela CategoriaUsuario
                if (categoriaId) {
                    await CategoriaUsuario.destroy({ where: { UserId, CategoriaId: categoriaId } });
                }
            }
        
            const deleted = await (tipo === 'receita'
                ? Receita.destroy({ where: { id, UserId } })
                : tipo === 'despesa'
                ? Despesas.destroy({ where: { id, UserId } })
                : Cartao.destroy({ where: { id, UserId } }));
    
            if (!deleted) {
                req.flash('error', `Erro ao remover ${tipo}.`);
                return res.redirect(`/financas/view${tipo.charAt(0).toUpperCase() + tipo.slice(1)}s`);
            }
    
            req.flash('message', `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} removido(a) com sucesso!`);
            req.session.save(() => {
                return res.redirect(`/financas/view${tipo.charAt(0).toUpperCase() + tipo.slice(1)}s`);
            });
        } catch (error) {
            console.error(`Erro ao remover ${tipo}:`, error);
            req.flash('error', `Erro ao tentar remover ${tipo}.`);
            return res.redirect(`/financas/view${tipo.charAt(0).toUpperCase() + tipo.slice(1)}s`);
        }
    }

    static async updateItem(req, res) {
        const { id, tipo, ...dados } = req.body;
        const UserId = req.session.userid;
    
        if (!UserId) {
            return res.redirect('/login');
        }
    
        try {
            console.log('Iniciando updateItem para tipo:', tipo, 'com dados:', dados);
            
            // Verificar se o tipo é válido (apenas receita ou despesa)
            if (tipo !== 'receita' && tipo !== 'despesa') {
                req.flash('error', 'Tipo inválido ou não suportado nesta função!');
                return res.redirect('/financas/dashboard');
            }
            
            let itemAntigo, categoriaIdAntiga, valorAntigo, dataAntiga, valorNovo;
            const hoje = new Date();
            const mesAtual = hoje.getMonth();
            const anoAtual = hoje.getFullYear();
            
            console.log('Mês atual:', mesAtual, 'Ano atual:', anoAtual);
            
            // Buscar o item original para comparação posterior
            if (tipo === 'receita') {
                itemAntigo = await Receita.findOne({ where: { id, UserId } });
                if (!itemAntigo) {
                    req.flash('error', 'Receita não encontrada!');
                    return res.redirect('/financas/viewReceitas');
                }
                valorAntigo = parseFloat(itemAntigo.value) || 0;
                categoriaIdAntiga = itemAntigo.CategoriaId;
                dataAntiga = new Date(itemAntigo.date);
                valorNovo = parseFloat(dados.value) || valorAntigo;
                
                console.log('Receita antiga:', {
                    id: itemAntigo.id,
                    value: valorAntigo,
                    date: dataAntiga,
                    foiProcessada: itemAntigo.foiProcessada
                });
                console.log('Novo valor da receita:', valorNovo);
                
                // Verificar se a nova data é do mês atual ou futuro
                const dataForm = dados.date ? new Date(dados.date) : dataAntiga;
                const mesDataForm = dataForm.getMonth();
                const anoDataForm = dataForm.getFullYear();
                
                const novaEhMesAtual = mesDataForm === mesAtual && anoDataForm === anoAtual;
                const novaEhFutura = (anoDataForm > anoAtual) || 
                                    (anoDataForm === anoAtual && mesDataForm > mesAtual);
                
                // IMPORTANTE: Definir a flag foiProcessada baseada na nova data
                if (novaEhMesAtual) {
                    dados.foiProcessada = true;
                    console.log('Definindo foiProcessada = true (mês atual)');
                } else if (novaEhFutura) {
                    dados.foiProcessada = false;
                    console.log('Definindo foiProcessada = false (mês futuro)');
                }
                
            } else if (tipo === 'despesa') {
                itemAntigo = await Despesas.findOne({ where: { id, UserId } });
                if (!itemAntigo) {
                    req.flash('error', 'Despesa não encontrada!');
                    return res.redirect('/financas/viewDespesas');
                }
                valorAntigo = parseFloat(itemAntigo.valor) || 0;
                categoriaIdAntiga = itemAntigo.CategoriaId;
                dataAntiga = new Date(itemAntigo.date);
                valorNovo = parseFloat(dados.valor) || valorAntigo;
                
                console.log('Despesa antiga:', {
                    id: itemAntigo.id,
                    valor: valorAntigo,
                    date: dataAntiga,
                    foiProcessada: itemAntigo.foiProcessada
                });
                console.log('Novo valor da despesa:', valorNovo);
                
                // Verificar se a nova data é do mês atual ou futuro
                const dataForm = dados.date ? new Date(dados.date) : dataAntiga;
                const mesDataForm = dataForm.getMonth();
                const anoDataForm = dataForm.getFullYear();
                
                const novaEhMesAtual = mesDataForm === mesAtual && anoDataForm === anoAtual;
                const novaEhFutura = (anoDataForm > anoAtual) || 
                                    (anoDataForm === anoAtual && mesDataForm > mesAtual);
                
                // IMPORTANTE: Definir a flag foiProcessada baseada na nova data
                if (novaEhMesAtual) {
                    dados.foiProcessada = true;
                    console.log('Definindo foiProcessada = true (mês atual)');
                } else if (novaEhFutura) {
                    dados.foiProcessada = false;
                    console.log('Definindo foiProcessada = false (mês futuro)');
                }
            }
    
            // Verificar mudança de status de processamento
            const itemEraProcessado = itemAntigo.foiProcessada;
            const novoProcessado = dados.foiProcessada;
            const statusProcessamentoMudou = itemEraProcessado !== novoProcessado;
            
            console.log('Status de processamento: de', itemEraProcessado, 'para', novoProcessado);
            console.log('Status de processamento mudou?', statusProcessamentoMudou);
            
            // Obter finanças para atualização
            const financas = await FinancaPessoais.findOne({ where: { UserId } });
            
            if (financas) {
                // Garantir que todos os valores sejam tratados como números
                let saldoAtual = parseFloat(financas.saldo) || 0;
                let totalReceitas = parseFloat(financas.totalReceitas) || 0;
                let totalDespesas = parseFloat(financas.totalDespesas) || 0;
                
                console.log('Finanças atuais antes da atualização:', {
                    saldo: saldoAtual,
                    totalReceitas: totalReceitas,
                    totalDespesas: totalDespesas
                });
                
                // 1. Se o item antigo foi processado, desfazer seu efeito
                if (itemEraProcessado) {
                    console.log('Desfazendo efeito do item antigo processado');
                    
                    if (tipo === 'receita') {
                        saldoAtual -= valorAntigo;
                        totalReceitas -= valorAntigo;
                    } else {
                        saldoAtual += valorAntigo;
                        totalDespesas -= valorAntigo;
                    }
                    
                    console.log('Finanças após desfazer efeito do item antigo:', {
                        saldo: saldoAtual,
                        totalReceitas: totalReceitas,
                        totalDespesas: totalDespesas
                    });
                }
                
                // 2. Se o novo item deve ser processado, aplicar novo valor
                if (novoProcessado) {
                    console.log('Aplicando efeito do novo item processado');
                    
                    if (tipo === 'receita') {
                        saldoAtual += valorNovo;
                        totalReceitas += valorNovo;
                    } else {
                        saldoAtual -= valorNovo;
                        totalDespesas += valorNovo;
                    }
                    
                    console.log('Finanças após aplicar efeito do novo item:', {
                        saldo: saldoAtual,
                        totalReceitas: totalReceitas,
                        totalDespesas: totalDespesas
                    });
                }
                
                // Atualizar o objeto financas com os novos valores calculados
                financas.saldo = saldoAtual;
                financas.totalReceitas = totalReceitas;
                financas.totalDespesas = totalDespesas;
                
                await financas.save();
                console.log('Finanças salvas com sucesso');
            }
            
            // Atualizar categorias
            const categoriaIdNova = dados.CategoriaId || categoriaIdAntiga;

            // Se a categoria mudou, atualizar ambas
            if (categoriaIdNova !== categoriaIdAntiga) {
                // Atualizar categoria antiga
                let catAntiga = await CategoriaUsuario.findOne({
                    where: { UserId, CategoriaId: categoriaIdAntiga }
                });

                if (catAntiga) {
                    if (tipo === 'receita') {
                        let totalRecebidoAntigo = parseFloat(catAntiga.totalRecebido) || 0;
                        totalRecebidoAntigo -= valorAntigo;
                        catAntiga.totalRecebido = Math.max(0, totalRecebidoAntigo);
                    } else {
                        let totalDespesasAntigo = parseFloat(catAntiga.totalDespesas) || 0;
                        totalDespesasAntigo -= valorAntigo;
                        catAntiga.totalDespesas = Math.max(0, totalDespesasAntigo);
                    }

                    await catAntiga.save();
                }

                // Atualizar nova categoria ou criar se não existir
                let [catNova, criada] = await CategoriaUsuario.findOrCreate({
                    where: { UserId, CategoriaId: categoriaIdNova },
                    defaults: {
                        totalRecebido: 0,
                        totalDespesas: 0
                    }
                });

                if (tipo === 'receita') {
                    let totalRecebidoNovo = parseFloat(catNova.totalRecebido) || 0;
                    totalRecebidoNovo += valorNovo;
                    catNova.totalRecebido = totalRecebidoNovo;
                } else {
                    let totalDespesasNovo = parseFloat(catNova.totalDespesas) || 0;
                    totalDespesasNovo += valorNovo;
                    catNova.totalDespesas = totalDespesasNovo;
                }

                await catNova.save();
            } else if (valorAntigo !== valorNovo) {
                // A categoria não mudou, mas o valor sim
                let [cat, criada] = await CategoriaUsuario.findOrCreate({
                    where: { UserId, CategoriaId: categoriaIdNova },
                    defaults: {
                        totalRecebido: 0,
                        totalDespesas: 0
                    }
                });

                if (tipo === 'receita') {
                    let totalRecebido = parseFloat(cat.totalRecebido) || 0;
                    if (itemEraProcessado) totalRecebido -= valorAntigo;
                    if (novoProcessado) totalRecebido += valorNovo;
                    cat.totalRecebido = Math.max(0, totalRecebido);
                } else {
                    let totalDespesas = parseFloat(cat.totalDespesas) || 0;
                    if (itemEraProcessado) totalDespesas -= valorAntigo;
                    if (novoProcessado) totalDespesas += valorNovo;
                    cat.totalDespesas = Math.max(0, totalDespesas);
                }

                await cat.save();
            }

            
            // Atualizar o item com os novos dados
            if (tipo === 'receita') {
                await Receita.update(dados, { where: { id, UserId } });
                req.flash('message', 'Receita atualizada com sucesso!');
                return res.redirect('/financas/viewReceitas');
            } else {
                await Despesas.update(dados, { where: { id, UserId } });
                req.flash('message', 'Despesa atualizada com sucesso!');
                return res.redirect('/financas/viewDespesas');
            }
        } catch (error) {
            console.error('Erro ao atualizar item:', error);
            req.flash('error', `Ocorreu um erro: ${error.message}`);
            
            if (tipo === 'receita') {
                return res.redirect('/financas/viewReceitas');
            } else {
                return res.redirect('/financas/viewDespesas');
            }
        }
    }  
}