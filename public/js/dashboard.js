document.addEventListener("DOMContentLoaded", function() {
    // Pegando os dados do Handlebars e convertendo para objetos JavaScript
    const despesas = JSON.parse('{{{despesas}}}');
    const receitas = JSON.parse('{{{receitas}}}');

    // Elementos para mostrar totais (pegando o segundo <span> dentro da div)
    const despesasTotalEl = document.getElementById('despesasTotal').querySelectorAll('span')[1];
    const receitasTotalEl = document.getElementById('receitasTotal').querySelectorAll('span')[1];

    // Função para formatar valores em reais
    const formatarReais = valor => {
        return 'R$ ' + parseFloat(valor).toFixed(2).replace('.', ',');
    };

    // Calcular e mostrar totais iniciais
    const totalDespesas = despesas.reduce((total, d) => total + parseFloat(d.valor || 0), 0);
    const totalReceitas = receitas.reduce((total, r) => total + parseFloat(r.valor || 0), 0);

    despesasTotalEl.textContent = formatarReais(totalDespesas);
    receitasTotalEl.textContent = formatarReais(totalReceitas);

    // Configurações comuns para ambos os gráficos
    const opcoesPie = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
            legend: {
                position: 'right',
                align: 'start',
                labels: {
                    boxWidth: 15,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const percentage = context.dataset.porcentagens[context.dataIndex];

                        return `${label}: ${formatarReais(value)} (${percentage.toFixed(2)}%)`;
                    }
                }
            }
        },
        layout: {
            padding: {
                left: 0,
                right: 50,
                top: 20,
                bottom: 20
            }
        }
    };

    // Gráfico de Despesas
    const graficoDespesas = new Chart(document.getElementById('graficoDespesas').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: despesas.map(d => d.title),
            datasets: [{
                data: despesas.map(d => parseFloat(d.valor || 0)),
                backgroundColor: ['#FF5733', '#FFBD33', '#FFC300', '#FF5733', '#C70039'],
                porcentagens: despesas.map(d => parseFloat(d.porcentagem || 0))
            }]
        },
        options: opcoesPie
    });

    // Gráfico de Receitas
    const graficoReceitas = new Chart(document.getElementById('graficoReceitas').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: receitas.map(r => r.title),
            datasets: [{
                data: receitas.map(r => parseFloat(r.valor || 0)),
                backgroundColor: ['#4CAF50', '#34A853', '#00A859', '#00C853', '#28A745'],
                porcentagens: receitas.map(r => parseFloat(r.porcentagem || 0))
            }]
        },
        options: opcoesPie
    });

    // Eventos para atualizar valores quando o mouse passa sobre os segmentos
    const atualizarTooltip = (event, chart, totalEl, totalGeral) => {
        const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
        if (elements.length > 0) {
            const index = elements[0].index;
            totalEl.textContent = formatarReais(chart.data.datasets[0].data[index]);
        } else {
            totalEl.textContent = formatarReais(totalGeral);
        }
    };

    document.getElementById('graficoDespesas').addEventListener('mousemove', function(e) {
        atualizarTooltip(e, graficoDespesas, despesasTotalEl, totalDespesas);
    });

    document.getElementById('graficoReceitas').addEventListener('mousemove', function(e) {
        atualizarTooltip(e, graficoReceitas, receitasTotalEl, totalReceitas);
    });

    // Restaurar valores totais quando o mouse sai
    document.getElementById('graficoDespesas').addEventListener('mouseout', function() {
        despesasTotalEl.textContent = formatarReais(totalDespesas);
    });

    document.getElementById('graficoReceitas').addEventListener('mouseout', function() {
        receitasTotalEl.textContent = formatarReais(totalReceitas);
    });
});
