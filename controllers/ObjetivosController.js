
const User = require('../models/User')
const objetivos = require('../models/Objetivos')
const objetivosRoutes = require('../routes/objetivosRoutes')

module.exports = class objetivosController{

    static async viewObjetivos(req, res) {
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }
    
        // Verificar se o usuário quer ver os objetivos concluídos ou não concluídos
        const showConcluidos = req.query.concluidos === 'true';
    
        try {
            // Buscar os objetivos do usuário com base no status de conclusão
            const objetivosUsuario = await objetivos.findAll({
                where: { UserId: userId, concluido: showConcluidos },
                raw: true
            });
    
            const objetivosComCalculos = objetivosUsuario.map(objetivo => {
                const faltando = parseFloat((objetivo.valor_objeto - objetivo.valor_guardado).toFixed(2));
                const depositoMensalAtual = parseFloat(objetivo.deposito_mensal) || 0;
                const tempoAtual = depositoMensalAtual > 0 && faltando > 0
                    ? `${Math.ceil(faltando / depositoMensalAtual)} meses`
                    : null; // Define como null se for "Indefinido"
            
                const progresso = Math.min(
                    Math.max((objetivo.valor_guardado / objetivo.valor_objeto) * 100, 0),
                    100
                ).toFixed(2);
            
                return {
                    ...objetivo,
                    faltando: objetivo.concluido ? null : faltando,
                    tempoAtual: objetivo.concluido ? null : tempoAtual, // Não exibe "Indefinido"
                    progresso
                };
            });
    
            res.render('financas/viewObjetivos', { objetivos: objetivosComCalculos, showConcluidos });
        } catch (error) {
            console.error('Erro ao carregar os objetivos:', error);
            req.flash('message', 'Ocorreu um erro ao carregar os objetivos!');
            res.redirect('/financas/dashboard');
        }
    }
    static async createObjetivo(req, res){
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }
        const objetivo ={
            title: req.body.title,
            valor_objeto: req.body.valor_objeto,
            valor_guardado: req.body.valor_guardado,
            UserId: userId,
        }

        try {
            
            await objetivos.create(objetivo);

            
            req.flash('message', 'Objetivo criado com sucesso!');
    
            req.session.save(err => {
                if (err) {
                    console.error('Erro ao salvar a sessão:', err);
                    return res.redirect('/objetivos/viewObjetivos');
                }
                return res.redirect('/objetivos/viewObjetivos');
            });

        } catch (error) {
            
            console.log('Aconteceu um erro: ', error);
            req.flash('message', 'Ocorreu um erro ao tentar criar a objetivo!');
            return res.redirect('/financas/viewObjetivos');
        }
    }
    static async addValorObjetivo(req, res) {
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }
    
        const { id } = req.params; // O ID do objetivo vem da URL
        const { valor_adicionado } = req.body; // O valor a adicionar vem do formulário
    
        try {
            // Buscar o objetivo atual no banco de dados
            const objetivo = await objetivos.findOne({
                where: { id: id, UserId: userId }
            });
    
            if (!objetivo) {
                req.flash('message', 'Objetivo não encontrado!');
                return res.redirect('/objetivos/viewObjetivos');
            }
    
            // Atualizar o valor guardado somando o valor adicionado
            const novoValorGuardado = parseFloat(objetivo.valor_guardado) + parseFloat(valor_adicionado);
    
            // Verificar se o objetivo foi concluído automaticamente
            const concluido = novoValorGuardado >= objetivo.valor_objeto;
    
            // Atualizar o objetivo no banco de dados
            await objetivos.update(
                { 
                    valor_guardado: novoValorGuardado,
                    deposito_mensal: parseFloat(valor_adicionado),
                    concluido // Atualiza o status de conclusão
                },
                { where: { id: id, UserId: userId } }
            );
    
            req.flash('message', concluido 
                ? 'Parabéns! Você concluiu este objetivo!'
                : 'Valor adicionado com sucesso!');
    
            req.session.save(err => {
                if (err) {
                    console.error('Erro ao salvar a sessão:', err);
                    return res.redirect('/objetivos/viewObjetivos');
                }
                return res.redirect('/objetivos/viewObjetivos');
            });
        } catch (error) {
            console.error('Erro ao adicionar valor ao objetivo:', error);
            req.flash('message', 'Ocorreu um erro ao adicionar o valor!');
            return res.redirect('/objetivos/viewObjetivos');
        }
    }


    static async removeObjetivo(req, res) {
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }
    
        const { id } = req.params; // O ID do objetivo vem da URL
    
        try {
            console.log('ID recebido no req.params:', id);
            console.log('ID do usuário:', userId);
    
            // Remover o objetivo do banco de dados
            await objetivos.destroy({
                where: { id: id, UserId: userId }
            });
    
            req.flash('message', 'Objetivo removido com sucesso!');
            req.session.save(err => {
                if (err) {
                    console.error('Erro ao salvar a sessão:', err);
                    return res.redirect('/objetivos/viewObjetivos');
                }
                return res.redirect('/objetivos/viewObjetivos');
            });
        } catch (error) {
            console.error('Erro ao remover o objetivo:', error);
            req.flash('message', 'Ocorreu um erro ao remover o objetivo!');
            return res.redirect('/objetivos/viewObjetivos');
        }
    }
    
    static async updateObjetivo(req, res) {
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }
    
        const { id } = req.params; // O ID do objetivo vem da URL
        const { title, valor_objeto, valor_guardado } = req.body; // Os dados do formulário
    
        try {
            console.log('ID recebido no req.params:', id);
            console.log('Dados recebidos no req.body:', req.body);
    
            // Atualizar o objetivo no banco de dados
            await objetivos.update(
                { title, valor_objeto, valor_guardado },
                { where: { id: id, UserId: userId } }
            );
    
            req.flash('message', 'Objetivo atualizado com sucesso!');
    
            req.session.save(err => {
                if (err) {
                    console.error('Erro ao salvar a sessão:', err);
                    return res.redirect('/objetivos/viewObjetivos');
                }
                return res.redirect('/objetivos/viewObjetivos');
            });
        } catch (error) {
            console.error('Erro ao atualizar o objetivo:', error);
            req.flash('message', 'Ocorreu um erro ao atualizar o objetivo!');
            return res.redirect('/objetivos/viewObjetivos');
        }
    }
    static async toggleConcluirObjetivo(req, res) {
        const userId = req.session.userid;
    
        if (!userId) {
            return res.redirect('/login');
        }
    
        const { id } = req.params; // O ID do objetivo vem da URL
    
        try {
            // Buscar o objetivo atual no banco de dados
            const objetivo = await objetivos.findOne({
                where: { id: id, UserId: userId }
            });
    
            if (!objetivo) {
                req.flash('message', 'Objetivo não encontrado!');
                return res.redirect('/objetivos/viewObjetivos');
            }
    
            // Alternar o status de "concluido"
            const novoStatus = !objetivo.concluido;
    
            // Atualizar o status no banco de dados
            await objetivos.update(
                { concluido: novoStatus },
                { where: { id: id, UserId: userId } }
            );
    
            req.flash('message', novoStatus ? 'Objetivo marcado como concluído!' : 'Objetivo desmarcado como concluído!');
            req.session.save(err => {
                if (err) {
                    console.error('Erro ao salvar a sessão:', err);
                    return res.redirect('/objetivos/viewObjetivos');
                }
                return res.redirect('/objetivos/viewObjetivos');
            });
        } catch (error) {
            console.error('Erro ao alternar o status do objetivo:', error);
            req.flash('message', 'Ocorreu um erro ao alterar o status do objetivo!');
            return res.redirect('/objetivos/viewObjetivos');
        }
    }
}