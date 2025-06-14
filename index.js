const express = require('express')
const exphbs = require('express-handlebars')
const session = require('express-session')
const flash = require('express-flash')
const Handlebars = require("handlebars")
const cron = require('node-cron');
const atualizarStatusFaturas = require('./helpers/atualizarStatusFaturas');
const app = express()

const conn = require('./db/conn')

// Models
const User = require('./models/User')
const FinancaPessoais = require('./models/FinancaPessoais')
const Despesas = require('./models/Despesas')
const Receitas = require('./models/Receita')
const Cartao = require('./models/Cartao')
const Categorias = require('./models/Categorias')
const CategoriaUsuario = require('./models/CategoriaUsuario')
const Fatura = require('./models/Fatura')
const DespesaCartao = require('./models/DespesaCartao')
const Objetivos = require('./models/Objetivos')


// Routes import
const financasRoutes = require('./routes/financasRoutes')
const authRoutes = require('./routes/authRoutes')
const faturasRoutes = require('./routes/faturasRoutes')
const objetivosRoutes = require('./routes/objetivosRoutes')

// Import controllers
const FinancasControllers = require('./controllers/FinancasControllers')
const FaturaController = require('./controllers/FaturasControllers')
const ObjetivosController = require('./controllers/ObjetivosController')

const hbs = exphbs.create({
    helpers: {
        // Helpers existentes
        formatDate: function (date) {
            if (!date) return "";
            
            const dataObj = new Date(date);
            
            // Corrige o fuso horário ajustando para o horário local
            dataObj.setMinutes(dataObj.getMinutes() + dataObj.getTimezoneOffset());

            const dia = String(dataObj.getDate()).padStart(2, "0");
            const mes = String(dataObj.getMonth() + 1).padStart(2, "0"); // Mês começa do zero
            const ano = dataObj.getFullYear();
            
            return `${dia}/${mes}/${ano}`;
        },
        json: function (context) {
            return JSON.stringify(context, null, 2); // Formata JSON para melhor leitura
        },
        eq: function (a, b) {
            return a === b; // Helper para comparação de valores
        },
        
        // Novos helpers para datas de cartão
        formatarDiaDoMes: function(dia) {
            return `Dia ${dia} de cada mês`;
        },
        
        proximoFechamento: function(diaFechamento) {
            const hoje = new Date();
            const mesAtual = hoje.getMonth();
            const anoAtual = hoje.getFullYear();
            
            // Criar uma data com o dia de fechamento no mês atual
            let dataFechamento = new Date(anoAtual, mesAtual, diaFechamento);
            
            // Se o dia de fechamento já passou neste mês, avançar para o próximo mês
            if (hoje > dataFechamento) {
                dataFechamento = new Date(anoAtual, mesAtual + 1, diaFechamento);
            }
            
            // Formatar a data no mesmo padrão do formatDate
            const dia = String(dataFechamento.getDate()).padStart(2, "0");
            const mes = String(dataFechamento.getMonth() + 1).padStart(2, "0");
            const ano = dataFechamento.getFullYear();
            
            return `${dia}/${mes}/${ano}`;
        },
        
        proximoVencimento: function(diaVencimento, diaFechamento) {
            const hoje = new Date();
            const mesAtual = hoje.getMonth();
            const anoAtual = hoje.getFullYear();
            
            // Determinar se o vencimento é no mesmo mês ou no próximo em relação ao fechamento
            let mesVencimento = mesAtual;
            let anoVencimento = anoAtual;
            
            // Criar uma data com o dia de fechamento no mês atual
            let dataFechamento = new Date(anoAtual, mesAtual, diaFechamento);
            
            // Se o fechamento já passou neste mês, considerar o próximo ciclo
            if (hoje > dataFechamento) {
                mesVencimento = mesAtual + 1;
                if (mesVencimento > 11) {
                    mesVencimento = 0;
                    anoVencimento = anoAtual + 1;
                }
            }
            
            // Se o dia de vencimento é menor que o dia de fechamento, significa que o vencimento
            // é no próximo mês em relação ao fechamento
            if (diaVencimento < diaFechamento) {
                mesVencimento = mesVencimento + 1;
                if (mesVencimento > 11) {
                    mesVencimento = 0;
                    anoVencimento = anoVencimento + 1;
                }
            }
            
            // Criar a data de vencimento
            const dataVencimento = new Date(anoVencimento, mesVencimento, diaVencimento);
            
            // Formatar a data no mesmo padrão do formatDate
            const dia = String(dataVencimento.getDate()).padStart(2, "0");
            const mes = String(dataVencimento.getMonth() + 1).padStart(2, "0");
            const ano = dataVencimento.getFullYear();
            
            return `${dia}/${mes}/${ano}`;
        },
        
        // Novos helpers para o cartão
        
        // Comparação maior que
        gt: function (a, b) {
            return a > b;
        },
        
        // Comparação maior ou igual
        gte: function (a, b) {
            return a >= b;
        },
        
        // Comparação menor que
        lt: function (a, b) {
            return a < b;
        },
        
        // Formatação de valores monetários
        formatMoney: function (value) {
            if (value === undefined || value === null) return "R$ 0,00";
            
            // Converter para número se for string
            const numero = typeof value === 'string' ? parseFloat(value) : value;
            
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2
            }).format(numero);
        },
        
        // Calcular porcentagem de uso de limite
        calcPercentUso: function (limite_total, limite_disponivel) {
            if (!limite_total || !limite_disponivel) return 0;
            
            const total = parseFloat(limite_total);
            const disponivel = parseFloat(limite_disponivel);
            
            // Evitar divisão por zero
            if (total === 0) return 0;
            
            const percentual = Math.round((1 - (disponivel / total)) * 100);
            
            // Retornar 0 se for negativo (caso limite_disponivel > limite_total)
            return percentual < 0 ? 0 : percentual;
        },
        
        // Determinar a classe CSS para a barra de progresso
        barraClass: function (percentUso) {
            if (percentUso >= 80) return "bg-danger";
            if (percentUso >= 60) return "bg-warning";
            return "bg-success";
        },
        
        // Helper para multiplicação (corrigido - agora dentro do objeto helpers)
        multiply: function(a, b) {
            return parseFloat(a) * parseFloat(b);
        },
        substring: function(texto, inicio, fim) {
            if (!texto) return '';
            return texto.substring(inicio, fim);
        },
    }
});

// Executa a função imediatamente para testar
(async () => {
    console.log('Testando atualização de status das faturas agora...');
    await atualizarStatusFaturas();
})()

cron.schedule('0 0 * * *', async () => {
    console.log('Executando atualização de status das faturas...');
    await atualizarStatusFaturas();
});

app.engine('handlebars', hbs.engine)
app.set('view engine', 'handlebars')

app.use(
    express.urlencoded({
        extended: true
    })
)
app.use(express.json())
app.use(
    session({
        name: 'session',
        secret: 'nosso_secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 1800000,
            httpOnly: true
        }
    }),
)

app.use(flash())

// Middleware para passar mensagens de flash para todas as views
app.use((req, res, next) => {
    res.locals.messages = {
        message: req.flash('message'),
        error: req.flash('error')
    };
    next();
});

app.use(express.static('public'))

app.use((req, res, next) => {
    if (req.session.userid) {
        res.locals.session = req.session
    }
    next()
})

// Routes
app.use('/financas', financasRoutes)
app.use('/', authRoutes)
app.use('/faturas', faturasRoutes); // Adicione esta linha para registrar as rotas de faturas
app.use('/objetivos', objetivosRoutes)
app.get('/', FinancasControllers.showMain)

conn
    //.sync({force:true})
    .sync()
    .then(() => {
        app.listen(3000)
    })
    .catch((err) => console.log(err))
