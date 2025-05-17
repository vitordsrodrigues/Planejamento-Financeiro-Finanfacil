function preencherModal(id, name, limite, dataFechamento, datavence) {
    console.log("ID:", id);
    console.log("Nome:", name);
    console.log("Limite:", limite);
    console.log("Data de Fechamento:", dataFechamento);
    console.log("Data de Vencimento:", datavence);

    document.getElementById('cartaoId').value = id;
    document.getElementById('cartaoName').value = name;
    document.getElementById('cartaoLimite').value = limite;
    document.getElementById('cartaoDataFechamento').value = dataFechamento;
    document.getElementById('cartaoDataVencimento').value = datavence;
}

// Nova função para preencher o modal de edição de cartões
document.addEventListener('DOMContentLoaded', function () {
    const editCartaoModal = document.getElementById("editCartaoModal");

    if (editCartaoModal) {
        editCartaoModal.addEventListener("show.bs.modal", function (event) {
            const button = event.relatedTarget; // Botão que acionou o modal

            // Preencher os campos do modal com os dados do botão
            const cartaoId = document.getElementById("cartaoId");
            const cartaoName = document.getElementById("cartaoName");
            const cartaoLimite = document.getElementById("cartaoLimite");
            const cartaoDataFechamento = document.getElementById("cartaoDataFechamento");
            const cartaoDataVencimento = document.getElementById("cartaoDataVencimento");

            if (cartaoId) cartaoId.value = button.getAttribute("data-id");
            if (cartaoName) cartaoName.value = button.getAttribute("data-name");
            if (cartaoLimite) cartaoLimite.value = button.getAttribute("data-limite");
            if (cartaoDataFechamento) cartaoDataFechamento.value = button.getAttribute("data-fechamento");
            if (cartaoDataVencimento) cartaoDataVencimento.value = button.getAttribute("data-vencimento");
        });
    }
});

function preencherDespesaModal(id) {
    document.getElementById('cartaoIdInput').value = id;
}

document.addEventListener('DOMContentLoaded', function () {
    const dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
    dropdownElementList.map(function (dropdownToggleEl) {
        return new bootstrap.Dropdown(dropdownToggleEl);
    });

    setupMonthSelection();
    setupYearButtons();
    setupPaymentButtons();
});

function setupMonthSelection() {
    const monthItems = document.querySelectorAll('.month-item');

    monthItems.forEach(item => {
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);

        newItem.addEventListener('click', function (e) {
            e.stopPropagation();
            document.querySelectorAll('.month-item').forEach(m => m.classList.remove('selected'));
            this.classList.add('selected');
            const radio = this.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });
}

function setupYearButtons() {
    const decrementBtn = document.querySelector('.year-btn:first-child');
    const incrementBtn = document.querySelector('.year-btn:last-child');

    if (decrementBtn) {
        const newDecrementBtn = decrementBtn.cloneNode(true);
        decrementBtn.parentNode.replaceChild(newDecrementBtn, decrementBtn);
        newDecrementBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            decrementYear();
        });
    }

    if (incrementBtn) {
        const newIncrementBtn = incrementBtn.cloneNode(true);
        incrementBtn.parentNode.replaceChild(newIncrementBtn, incrementBtn);
        newIncrementBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            incrementYear();
        });
    }
}

function incrementYear() {
    const yearInput = document.getElementById('ano');
    if (yearInput) {
        let currentYear = parseInt(yearInput.value);
        if (!isNaN(currentYear) && currentYear < 2100) {
            yearInput.value = currentYear + 1;
        }
    }
}

function decrementYear() {
    const yearInput = document.getElementById('ano');
    if (yearInput) {
        let currentYear = parseInt(yearInput.value);
        if (!isNaN(currentYear) && currentYear > 2000) {
            yearInput.value = currentYear - 1;
        }
    }
}

function setupPaymentButtons() {
    const paymentButtons = document.querySelectorAll('[id^="pagar-btn-"]');

    paymentButtons.forEach(button => {
        button.addEventListener('click', function () {
            const faturaId = this.id.replace('pagar-btn-', '');
            marcarComoPago(faturaId);
        });
    });
}

function marcarComoPago(faturaId) {
    const botao = document.getElementById(`pagar-btn-${faturaId}`);

    botao.disabled = true;
    botao.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Processando...';

    fetch(`/faturas/pagar/${faturaId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            botao.innerHTML = '<i class="bi bi-check-circle me-1"></i> Pago';
            botao.classList.remove('btn-outline-success');
            botao.classList.add('btn-success');
            botao.disabled = true;
            setTimeout(() => window.location.reload(), 1500);
        } else {
            botao.innerHTML = '<i class="bi bi-x-circle me-1"></i> Erro';
            botao.classList.remove('btn-outline-success');
            botao.classList.add('btn-danger');
            botao.disabled = false;
            if (data.message) alert(data.message);
        }
    })
    .catch(error => {
        console.error("Erro ao pagar fatura:", error);
        botao.innerHTML = '<i class="bi bi-x-circle me-1"></i> Erro';
        botao.classList.add('btn-danger');
        botao.disabled = false;
        alert("Erro ao processar o pagamento. Tente novamente.");
    });
}