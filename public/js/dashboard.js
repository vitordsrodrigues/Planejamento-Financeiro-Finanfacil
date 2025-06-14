document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando renderização do dashboard...');
    console.log('Chart.js disponível:', typeof Chart !== 'undefined');

    // Função para obter dados dos elementos script
    function getDataFromScript(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Elemento ${id} não encontrado`);
            return [];
        }
        try {
            const data = JSON.parse(element.textContent);
            console.log(`Dados de ${id}:`, data);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(`Erro ao parsear dados de ${id}:`, error);
            return [];
        }
    }

    // Obter dados
    const despesasData = getDataFromScript('despesas-data');
    const receitasData = getDataFromScript('receitas-data');
    const cartoesData = getDataFromScript('cartoes-data');
    const graficoGeralData = getDataFromScript('graficoGeral-data');

    console.log('Dados obtidos:', {
        despesas: despesasData,
        receitas: receitasData,
        cartoes: cartoesData,
        geral: graficoGeralData
    });

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

    // Função para renderizar gráfico de pizza
    function renderPieChart(canvasId, data, title, colors) {
        console.log(`Tentando renderizar gráfico ${canvasId} com dados:`, data);
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} não encontrado`);
            return;
        }

        // Se não houver dados, mostrar mensagem
        if (!data || data.length === 0) {
            console.log(`Sem dados para ${canvasId}, mostrando mensagem`);
            canvas.parentElement.innerHTML = `
                <div class="text-center p-4">
                    <p class="text-muted">Nenhum dado disponível para este período</p>
                </div>
            `;
            return;
        }

        const total = data.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
        
        // Atualizar o total no elemento correspondente
        const totalElement = document.getElementById(canvasId.replace('grafico', '') + 'Total');
        if (totalElement) {
            totalElement.querySelector('.grafico-valor').textContent = 
                `R$ ${total.toFixed(2)}`;
        }

        try {
            new Chart(canvas, {
                type: 'pie',
                data: {
                    labels: data.map(item => item.nome),
                    datasets: [{
                        data: data.map(item => parseFloat(item.valor) || 0),
                        backgroundColor: colors
                    }]
                },
                options: commonOptions
            });
            console.log(`Gráfico ${canvasId} renderizado com sucesso`);
        } catch (error) {
            console.error(`Erro ao renderizar gráfico ${canvasId}:`, error);
        }
    }

    // Renderizar gráficos
    renderPieChart('graficoReceitas', receitasData, 'Receitas', [
        '#28a745', '#20c997', '#17a2b8', '#0dcaf0', '#0d6efd'
    ]);

    renderPieChart('graficoDespesas', despesasData, 'Despesas', [
        '#dc3545', '#fd7e14', '#ffc107', '#198754', '#0dcaf0'
    ]);

    renderPieChart('graficoCartoes', cartoesData, 'Cartões', [
        '#ffc107', '#fd7e14', '#dc3545', '#198754', '#0dcaf0'
    ]);

    // Renderizar gráfico Geral
    const canvasGeral = document.getElementById('graficoGeral');
    if (canvasGeral) {
        console.log('Tentando renderizar gráfico geral com dados:', graficoGeralData);

        // Se não houver dados, mostrar mensagem
        if (!graficoGeralData || graficoGeralData.length === 0) {
            console.log('Sem dados para gráfico geral, mostrando mensagem');
            canvasGeral.parentElement.innerHTML = `
                <div class="text-center p-4">
                    <p class="text-muted">Nenhum dado disponível para este período</p>
                </div>
            `;
            return;
        }

        const totalGeral = graficoGeralData.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
        
        // Atualizar o total
        const totalElement = document.getElementById('geralTotal');
        if (totalElement) {
            totalElement.querySelector('.grafico-valor').textContent = 
                `R$ ${totalGeral.toFixed(2)}`;
        }

        try {
            new Chart(canvasGeral, {
                type: 'bar',
                data: {
                    labels: graficoGeralData.map(item => item.nome),
                    datasets: [{
                        label: 'Valores',
                        data: graficoGeralData.map(item => parseFloat(item.valor) || 0),
                        backgroundColor: ['#28a745', '#dc3545', '#ffc107']
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
            console.log('Gráfico geral renderizado com sucesso');
        } catch (error) {
            console.error('Erro ao renderizar gráfico geral:', error);
        }
    } else {
        console.error('Canvas do gráfico geral não encontrado');
    }

    // Eventos do dropdown e seleção de mês/ano
    document.querySelectorAll('.month-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('.month-item').forEach(el => el.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
        dropdown.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    });

    window.incrementYear = function () {
        const yearInput = document.getElementById('ano');
        if (yearInput) {
            let currentYear = parseInt(yearInput.value);
            if (!isNaN(currentYear) && currentYear < 2100) {
                yearInput.value = currentYear + 1;
            }
        }
    };

    window.decrementYear = function () {
        const yearInput = document.getElementById('ano');
        if (yearInput) {
            let currentYear = parseInt(yearInput.value);
            if (!isNaN(currentYear) && currentYear > 2000) {
                yearInput.value = currentYear - 1;
            }
        }
    };
}); 