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

    // Função para formatar valores em reais
    function formatarReais(valor) {
        return `R$ ${parseFloat(valor).toFixed(2)}`;
    }

    // Cores dos gráficos
    const coresDespesas = ['#FF5733', '#C70039', '#900C3F', '#FFC300'];
    const coresReceitas = ['#4CAF50', '#8BC34A', '#03A9F4', '#2196F3'];
    const coresCartoes = ['#FFC107', '#FFD54F', '#FFEB3B', '#FFF176'];
    const coresGeral = ['#4CAF50', '#FF5733', '#FFC300'];

    // Configuração comum para os gráficos
    const opcoesPie = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        },
        layout: { padding: { left: 0, right: 0, top: 20, bottom: 20 } }
    };

    // Função para criar o gráfico
    function criarGrafico(ctx, dados, cores) {
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: dados.map(d => d.nome),
                datasets: [{
                    data: dados.map(d => parseFloat(d.valor || 0)),
                    backgroundColor: cores,
                    porcentagens: dados.map(d => parseFloat(d.porcentagem || 0))
                }]
            },
            options: opcoesPie
        });
    }

    // Função para configurar eventos de hover
    function configurarEventosHover(canvasId, chart, totalEl, totalValor) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Atualiza o total inicial
        totalEl[0].textContent = 'Total';
        totalEl[1].textContent = formatarReais(totalValor);

        canvas.addEventListener('mousemove', function(e) {
            const elements = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
            if (elements.length > 0) {
                const index = elements[0].index;
                const categoria = chart.data.labels[index];
                const valor = chart.data.datasets[0].data[index];
                const porcentagem = chart.data.datasets[0].porcentagens[index];

                totalEl[0].textContent = categoria;
                totalEl[1].textContent = formatarReais(valor);

                let porcentagemEl = totalEl[1].parentNode.querySelector('.grafico-porcentagem');
                if (!porcentagemEl) {
                    porcentagemEl = document.createElement('span');
                    porcentagemEl.className = 'grafico-porcentagem';
                    totalEl[1].parentNode.appendChild(porcentagemEl);
                }
                porcentagemEl.textContent = `${porcentagem.toFixed(2)}%`;
            } else {
                totalEl[0].textContent = 'Total';
                totalEl[1].textContent = formatarReais(totalValor);
                const porcentagemEl = totalEl[1].parentNode.querySelector('.grafico-porcentagem');
                if (porcentagemEl) {
                    porcentagemEl.remove();
                }
            }
        });

        canvas.addEventListener('mouseout', function() {
            totalEl[0].textContent = 'Total';
            totalEl[1].textContent = formatarReais(totalValor);
            const porcentagemEl = totalEl[1].parentNode.querySelector('.grafico-porcentagem');
            if (porcentagemEl) {
                porcentagemEl.remove();
            }
        });
    }

    // Renderizar os gráficos
    function renderizarGraficos(dados) {
        // Gráfico de Receitas
        if (dados.receitas && dados.receitas.length > 0) {
            const ctxReceitas = document.getElementById('graficoReceitas').getContext('2d');
            const totalReceitas = dados.receitas.reduce((sum, item) => sum + (parseFloat(item.valor) || 0), 0);
            const graficoReceitas = criarGrafico(ctxReceitas, dados.receitas, coresReceitas);
            
            const totalEl = [
                document.querySelector('#receitasTotal .grafico-label'),
                document.querySelector('#receitasTotal .grafico-valor')
            ];
            configurarEventosHover('graficoReceitas', graficoReceitas, totalEl, totalReceitas);
        }

        // Gráfico de Despesas
        if (dados.despesas && dados.despesas.length > 0) {
            const ctxDespesas = document.getElementById('graficoDespesas').getContext('2d');
            const totalDespesas = dados.despesas.reduce((sum, item) => sum + (parseFloat(item.valor) || 0), 0);
            const graficoDespesas = criarGrafico(ctxDespesas, dados.despesas, coresDespesas);
            
            const totalEl = [
                document.querySelector('#despesasTotal .grafico-label'),
                document.querySelector('#despesasTotal .grafico-valor')
            ];
            configurarEventosHover('graficoDespesas', graficoDespesas, totalEl, totalDespesas);
        }

        // Gráfico de Cartões
        if (dados.cartoes && dados.cartoes.length > 0) {
            const ctxCartoes = document.getElementById('graficoCartoes').getContext('2d');
            const totalCartoes = dados.cartoes.reduce((sum, item) => sum + (parseFloat(item.valor) || 0), 0);
            const graficoCartoes = criarGrafico(ctxCartoes, dados.cartoes, coresCartoes);
            
            const totalEl = [
                document.querySelector('#cartoesTotal .grafico-label'),
                document.querySelector('#cartoesTotal .grafico-valor')
            ];
            configurarEventosHover('graficoCartoes', graficoCartoes, totalEl, totalCartoes);
        }

        // Gráfico Geral
        if (dados.geral && dados.geral.length > 0) {
            const ctxGeral = document.getElementById('graficoGeral').getContext('2d');
            const totalGeral = dados.geral.reduce((sum, item) => sum + (parseFloat(item.valor) || 0), 0);
            const graficoGeral = criarGrafico(ctxGeral, dados.geral, coresGeral);
            
            const totalEl = [
                document.querySelector('#geralTotal .grafico-label'),
                document.querySelector('#geralTotal .grafico-valor')
            ];
            configurarEventosHover('graficoGeral', graficoGeral, totalEl, totalGeral);
        }
    }

    // Renderizar gráficos
    console.log('Iniciando renderização dos gráficos...');
    
    // Verificar se os dados estão vazios antes de renderizar
    if (receitasData && receitasData.length > 0) {
        console.log('Renderizando gráfico de receitas com dados:', receitasData);
        renderizarGraficos({ receitas: receitasData });
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
        renderizarGraficos({ despesas: despesasData });
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
        renderizarGraficos({ cartoes: cartoesData });
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
            const totalGeral = graficoGeralData.reduce((sum, item) => sum + (parseFloat(item.valor) || 0), 0);
            const graficoGeral = criarGrafico(canvasGeral.getContext('2d'), graficoGeralData, coresGeral);
            
            const totalEl = [
                document.querySelector('#geralTotal .grafico-label'),
                document.querySelector('#geralTotal .grafico-valor')
            ];
            configurarEventosHover('graficoGeral', graficoGeral, totalEl, totalGeral);
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