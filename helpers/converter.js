function converterDataParaISO(dataBrasileira) {
    const [dia, mes, ano] = dataBrasileira.split('/'); // Divide a string no formato DD/MM/YYYY
    return `${ano}-${mes}-${dia}`; // Retorna no formato ISO (YYYY-MM-DD)
}

module.exports = converterDataParaISO; // Exporta a função