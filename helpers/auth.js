module.exports.checkAuth = function(req,res,next){

    const userId = req.session.userid

    if(!userId){
       return res.redirect('/login')
    }

    next()
}

//<p><span>Planejamento</span> &copy;2025</p>