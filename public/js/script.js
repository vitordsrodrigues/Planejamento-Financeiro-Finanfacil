document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
        let flashMessage = document.getElementById("flash-message");
        if (flashMessage) {
            flashMessage.style.transition = "opacity 0.5s ease-out";
            flashMessage.style.opacity = "0";
            setTimeout(() => flashMessage.remove(), 500);
        }
    }, 6000); // A mensagem desaparecerá após 6 segundos
});
document.addEventListener("DOMContentLoaded", function() {
    const despesas = JSON.parse(document.getElementById('despesas-data').textContent);
    const receitas = JSON.parse(document.getElementById('receitas-data').textContent);
    const cartoes = JSON.parse(document.getElementById('cartoes-data').textContent);
    const graficoGeralData = JSON.parse(document.getElementById('graficoGeral-data').textContent);

    const despesasTotalEl = document.getElementById('despesasTotal').querySelectorAll('span');
    const receitasTotalEl = document.getElementById('receitasTotal').querySelectorAll('span');
    const cartoesTotalEl = document.getElementById('cartoesTotal').querySelectorAll('span');
    const geralTotalEl = document.getElementById('geralTotal').querySelectorAll('span');

    const formatarReais = valor => 'R$ ' + parseFloat(valor).toFixed(2).replace('.', ',');

    const totalDespesas = despesas.reduce((total, d) => total + parseFloat(d.valor || 0), 0);
    const totalReceitas = receitas.reduce((total, r) => total + parseFloat(r.valor || 0), 0);
    const totalCartoes = cartoes.reduce((total, c) => total + parseFloat(c.valor || 0), 0);

    despesasTotalEl[1].textContent = formatarReais(totalDespesas);
    receitasTotalEl[1].textContent = formatarReais(totalReceitas);
    cartoesTotalEl[1].textContent = formatarReais(totalCartoes);

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

    const criarGrafico = (ctx, dados, cores) => new Chart(ctx, {
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

    const coresDespesas = ['#FF5733', '#C70039', '#900C3F', '#FFC300'];
    const coresReceitas = ['#4CAF50', '#8BC34A', '#03A9F4', '#2196F3'];
    const coresCartoes = ['#FFC107', '#FFD54F', '#FFEB3B', '#FFF176'];
    const coresGeral = ['#4CAF50', '#FF5733', '#FFC300'];

    const graficoDespesas = criarGrafico(document.getElementById('graficoDespesas').getContext('2d'), despesas, coresDespesas);
    const graficoReceitas = criarGrafico(document.getElementById('graficoReceitas').getContext('2d'), receitas, coresReceitas);
    const graficoCartoes = criarGrafico(document.getElementById('graficoCartoes').getContext('2d'), cartoes, coresCartoes);
    const graficoGeral = criarGrafico(document.getElementById('graficoGeral').getContext('2d'), graficoGeralData, coresGeral);

    const configurarEventosHover = (canvasId, chart, totalEl, totalValor) => {
        document.getElementById(canvasId).addEventListener('mousemove', function(e) {
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
                    porcentagemEl.style.fontSize = '16px';
                    porcentagemEl.style.color = '#333';
                    porcentagemEl.style.display = 'block';
                    porcentagemEl.style.marginTop = '5px';
                    totalEl[1].parentNode.appendChild(porcentagemEl);
                }

                porcentagemEl.textContent = `${porcentagem.toFixed(2)}%`;
            } else {
                totalEl[0].textContent = 'Total';
                totalEl[1].textContent = formatarReais(totalValor);
                const porcentagemEl = totalEl[1].parentNode.querySelector('.grafico-porcentagem');
                if (porcentagemEl) porcentagemEl.remove();
            }
        });

        document.getElementById(canvasId).addEventListener('mouseout', function() {
            totalEl[0].textContent = 'Total';
            totalEl[1].textContent = formatarReais(totalValor);
            const porcentagemEl = totalEl[1].parentNode.querySelector('.grafico-porcentagem');
            if (porcentagemEl) porcentagemEl.remove();
        });
    };

    configurarEventosHover('graficoDespesas', graficoDespesas, despesasTotalEl, totalDespesas);
    configurarEventosHover('graficoReceitas', graficoReceitas, receitasTotalEl, totalReceitas);
    configurarEventosHover('graficoCartoes', graficoCartoes, cartoesTotalEl, totalCartoes);
    configurarEventosHover('graficoGeral', graficoGeral, geralTotalEl, totalDespesas + totalReceitas + totalCartoes);

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
document.addEventListener("DOMContentLoaded", function () {
    const track = document.querySelector('.carousel-track');
  
    function pauseScroll() {
      track.style.animationPlayState = 'paused';
    }
  
    function resumeScroll() {
      track.style.animationPlayState = 'running';
    }
  
    // Você pode exportar essas funções se for usar em eventos inline
    window.pauseScroll = pauseScroll;
    window.resumeScroll = resumeScroll;
  });
  