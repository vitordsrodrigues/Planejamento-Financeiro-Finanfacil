const User = require('../models/User')

const bcrypt = require('bcryptjs')

module.exports = class AuthControllers{
    static login(req,res){
        res.render('auth/login',{layout:'auth',title:'Login'})
    }
    static async loginPost(req,res){
        const {email, password} = req.body

        const user = await User.findOne({where:{email:email}})

        if(!user){
            req.flash('message', 'usuario não encontrado')
            res.render('auth/login')
            return
        }

        const passwordMatch = bcrypt.compareSync(password,user.password)

        if(!passwordMatch){
            req.flash('message', 'Senha incorreta!')
            res.render('auth/login')
            return
        }
         req.session.userid = user.id

        req.flash('message', 'login realizado com sucesso')
        req.session.save(()=>{
              res.redirect('/financas/dashboard'); // Alterado para redirecionar para o dashboard
        })
    }
    static register(req,res){
        res.render('auth/register',{layout:'auth',title:'register'})
    }
    static async registerPost (req,res){

        const {name,email,password,confirmpassword} = req.body

        if(password != confirmpassword){
            req.flash('message','as senhas não conferem, tente novamente!')
            res.render('auth/register')

            return
        }

        //chegar se o usuario ja existe

        const checkifUserExist = await User.findOne({where:{email:email}})
        if(checkifUserExist){
            req.flash('message','o email ja esta em uso')
            res.render('auth/register')

            return
        }

        const salt = bcrypt.genSaltSync(10)
        const hashedPassword = bcrypt.hashSync(password, salt)

        const user={
            name,
            email,
            password:hashedPassword
        }
        try{
            const createdUser = await User.create(user)

             req.session.userid = createdUser.id

            req.flash('message', 'cadastro realizado com sucesso')
            req.session.save(()=>{
                res.redirect('/financas/dashboard'); // Alterado para redirecionar para o dashboard
            })
        }catch(err){
            console.log(err)
        }


    }

    static logout(req,res){
        req.session.destroy()
        res.redirect('/login')
    }
}