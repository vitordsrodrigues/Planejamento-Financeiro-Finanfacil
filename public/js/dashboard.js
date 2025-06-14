// Aguardar o carregamento completo da página
window.addEventListener('load', function() {
    console.log('Página carregada, verificando Chart.js...');
    
    // Verificar se o Chart.js está disponível
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não está disponível!');
        return;
    }
    
    console.log('Chart.js disponível:', typeof Chart !== 'undefined');

    // Função para obter dados dos elementos script
    function getDataFromScript(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Elemento ${id} não encontrado`);
            return [];
        }
        try {
            console.log(`Conteúdo bruto do elemento ${id}:`, element.textContent);
            const data = JSON.parse(element.textContent);
            console.log(`Dados parseados de ${id}:`, data);
            return data;
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

    // Renderizar gráficos
    console.log('Iniciando renderização dos gráficos...');
    
    // Verificar se os dados estão vazios antes de renderizar
    if (receitasData && receitasData.length > 0) {
        console.log('Renderizando gráfico de receitas com dados:', receitasData);
        const canvas = document.getElementById('graficoReceitas');
        if (canvas) {
            try {
                const chart = new Chart(canvas, {
                    type: 'pie',
                    data: {
                        labels: receitasData.map(item => item.nome),
                        datasets: [{
                            data: receitasData.map(item => parseFloat(item.valor) || 0),
                            backgroundColor: ['#28a745', '#20c997', '#17a2b8', '#0dcaf0', '#0d6efd']
                        }]
                    },
                    options: commonOptions
                });
                console.log('Gráfico de receitas renderizado:', chart);

                // Atualizar o total
                const totalReceitas = receitasData.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
                const totalElement = document.getElementById('receitasTotal');
                if (totalElement) {
                    totalElement.querySelector('.grafico-valor').textContent = `R$ ${totalReceitas.toFixed(2)}`;
                }
            } catch (error) {
                console.error('Erro ao renderizar gráfico de receitas:', error);
            }
        } else {
            console.error('Canvas do gráfico de receitas não encontrado');
        }
    } else {
        console.log('Sem dados para renderizar gráfico de receitas');
        const canvas = document.getElementById('graficoReceitas');
        if (canvas) {
            canvas.parentElement.innerHTML = `
                <div class="text-center p-4">
                    <p class="text-muted">Nenhum dado disponível para este período</p>
                </div>
            `;
        }
    }

    if (despesasData && despesasData.length > 0) {
        console.log('Renderizando gráfico de despesas com dados:', despesasData);
        const canvas = document.getElementById('graficoDespesas');
        if (canvas) {
            try {
                const chart = new Chart(canvas, {
                    type: 'pie',
                    data: {
                        labels: despesasData.map(item => item.nome),
                        datasets: [{
                            data: despesasData.map(item => parseFloat(item.valor) || 0),
                            backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#198754', '#0dcaf0']
                        }]
                    },
                    options: commonOptions
                });
                console.log('Gráfico de despesas renderizado:', chart);

                // Atualizar o total
                const totalDespesas = despesasData.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
                const totalElement = document.getElementById('despesasTotal');
                if (totalElement) {
                    totalElement.querySelector('.grafico-valor').textContent = `R$ ${totalDespesas.toFixed(2)}`;
                }
            } catch (error) {
                console.error('Erro ao renderizar gráfico de despesas:', error);
            }
        } else {
            console.error('Canvas do gráfico de despesas não encontrado');
        }
    } else {
        console.log('Sem dados para renderizar gráfico de despesas');
        const canvas = document.getElementById('graficoDespesas');
        if (canvas) {
            canvas.parentElement.innerHTML = `
                <div class="text-center p-4">
                    <p class="text-muted">Nenhum dado disponível para este período</p>
                </div>
            `;
        }
    }

    if (cartoesData && cartoesData.length > 0) {
        console.log('Renderizando gráfico de cartões com dados:', cartoesData);
        const canvas = document.getElementById('graficoCartoes');
        if (canvas) {
            try {
                const chart = new Chart(canvas, {
                    type: 'pie',
                    data: {
                        labels: cartoesData.map(item => item.nome),
                        datasets: [{
                            data: cartoesData.map(item => parseFloat(item.valor) || 0),
                            backgroundColor: ['#ffc107', '#fd7e14', '#dc3545', '#198754', '#0dcaf0']
                        }]
                    },
                    options: commonOptions
                });
                console.log('Gráfico de cartões renderizado:', chart);

                // Atualizar o total
                const totalCartoes = cartoesData.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
                const totalElement = document.getElementById('cartoesTotal');
                if (totalElement) {
                    totalElement.querySelector('.grafico-valor').textContent = `R$ ${totalCartoes.toFixed(2)}`;
                }
            } catch (error) {
                console.error('Erro ao renderizar gráfico de cartões:', error);
            }
        } else {
            console.error('Canvas do gráfico de cartões não encontrado');
        }
    } else {
        console.log('Sem dados para renderizar gráfico de cartões');
        const canvas = document.getElementById('graficoCartoes');
        if (canvas) {
            canvas.parentElement.innerHTML = `
                <div class="text-center p-4">
                    <p class="text-muted">Nenhum dado disponível para este período</p>
                </div>
            `;
        }
    }

    // Renderizar gráfico Geral
    console.log('Renderizando gráfico geral...');
    const canvasGeral = document.getElementById('graficoGeral');
    if (canvasGeral) {
        if (graficoGeralData && graficoGeralData.length > 0) {
            console.log('Renderizando gráfico geral com dados:', graficoGeralData);
            try {
                const totalGeral = graficoGeralData.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
                
                // Atualizar o total
                const totalElement = document.getElementById('geralTotal');
                if (totalElement) {
                    totalElement.querySelector('.grafico-valor').textContent = `R$ ${totalGeral.toFixed(2)}`;
                }

                const chart = new Chart(canvasGeral, {
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
                console.log('Gráfico geral renderizado:', chart);
            } catch (error) {
                console.error('Erro ao renderizar gráfico geral:', error);
            }
        } else {
            console.log('Sem dados para renderizar gráfico geral');
            canvasGeral.parentElement.innerHTML = `
                <div class="text-center p-4">
                    <p class="text-muted">Nenhum dado disponível para este período</p>
                </div>
            `;
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