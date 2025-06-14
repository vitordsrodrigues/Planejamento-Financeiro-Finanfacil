document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando renderização do dashboard...');

    // Função para obter dados dos elementos script
    function getDataFromScript(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Elemento ${id} não encontrado`);
            return null;
        }
        try {
            const data = JSON.parse(element.textContent);
            console.log(`Dados de ${id}:`, data);
            return data;
        } catch (error) {
            console.error(`Erro ao parsear dados de ${id}:`, error);
            return null;
        }
    }

    // Obter dados
    const despesasData = getDataFromScript('despesas-data');
    const receitasData = getDataFromScript('receitas-data');
    const cartoesData = getDataFromScript('cartoes-data');
    const graficoGeralData = getDataFromScript('graficoGeral-data');

    // Configuração comum para os gráficos
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            }
        }
    };

    // Renderizar gráfico de Receitas
    if (receitasData && receitasData.length > 0) {
        new Chart(document.getElementById('graficoReceitas'), {
            type: 'pie',
            data: {
                labels: receitasData.map(item => item.nome),
                datasets: [{
                    data: receitasData.map(item => item.valor),
                    backgroundColor: [
                        '#28a745', '#20c997', '#17a2b8', '#0dcaf0', '#0d6efd'
                    ]
                }]
            },
            options: commonOptions
        });
        document.getElementById('receitasTotal').querySelector('.grafico-valor').textContent = 
            `R$ ${receitasData.reduce((acc, curr) => acc + curr.valor, 0).toFixed(2)}`;
    }

    // Renderizar gráfico de Despesas
    if (despesasData && despesasData.length > 0) {
        new Chart(document.getElementById('graficoDespesas'), {
            type: 'pie',
            data: {
                labels: despesasData.map(item => item.nome),
                datasets: [{
                    data: despesasData.map(item => item.valor),
                    backgroundColor: [
                        '#dc3545', '#fd7e14', '#ffc107', '#198754', '#0dcaf0'
                    ]
                }]
            },
            options: commonOptions
        });
        document.getElementById('despesasTotal').querySelector('.grafico-valor').textContent = 
            `R$ ${despesasData.reduce((acc, curr) => acc + curr.valor, 0).toFixed(2)}`;
    }

    // Renderizar gráfico de Cartões
    if (cartoesData && cartoesData.length > 0) {
        new Chart(document.getElementById('graficoCartoes'), {
            type: 'pie',
            data: {
                labels: cartoesData.map(item => item.nome),
                datasets: [{
                    data: cartoesData.map(item => item.valor),
                    backgroundColor: [
                        '#ffc107', '#fd7e14', '#dc3545', '#198754', '#0dcaf0'
                    ]
                }]
            },
            options: commonOptions
        });
        document.getElementById('cartoesTotal').querySelector('.grafico-valor').textContent = 
            `R$ ${cartoesData.reduce((acc, curr) => acc + curr.valor, 0).toFixed(2)}`;
    }

    // Renderizar gráfico Geral
    if (graficoGeralData && graficoGeralData.length > 0) {
        new Chart(document.getElementById('graficoGeral'), {
            type: 'bar',
            data: {
                labels: graficoGeralData.map(item => item.nome),
                datasets: [{
                    label: 'Valores',
                    data: graficoGeralData.map(item => item.valor),
                    backgroundColor: [
                        '#28a745', '#dc3545', '#ffc107'
                    ]
                }]
            },
            options: {
                ...commonOptions,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        document.getElementById('geralTotal').querySelector('.grafico-valor').textContent = 
            `R$ ${graficoGeralData.reduce((acc, curr) => acc + curr.valor, 0).toFixed(2)}`;
    }
}); 