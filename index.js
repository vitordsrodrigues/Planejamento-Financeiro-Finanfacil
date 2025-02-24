const express = require('express')
const exphbs = require('express-handlebars')
const session = require('express-session')
const FileStore = require('session-file-store')(session)
const flash = require('express-flash')
const Handlebars = require("handlebars")

const app = express()

const conn = require('./db/conn')

// Models
const User = require('./models/User')
const FinancaPessoais = require('./models/FinancaPessoais')
const Despesas = require('./models/Despesas')
const Cartao = require('./models/Cartao')
const TotalDespesas = require('./models/TotalDespesas')

// Routes import
const financasRoutes = require('./routes/financasRoutes')
const authRoutes = require('./routes/authRoutes')

// Import controllers
const FinancasControllers = require('./controllers/FinancasControllers')

// Configuração do Handlebars
const hbs = exphbs.create({
    helpers: {
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
        }
    }
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
        store: new FileStore({
            logFn: function () { },
            path: require('path').join(require('os').tmpdir(), 'sessions'),
            ttl: 28800,
        }),
        cookie: {
            secure: false,
            maxAge: 1800000,
            httpOnly: true
        }
    }),
)

app.use(flash())

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
app.get('/', FinancasControllers.showMain)

conn
    //.sync({force:true})
    .sync()
    .then(() => {
        app.listen(3000)
    })
    .catch((err) => console.log(err))
