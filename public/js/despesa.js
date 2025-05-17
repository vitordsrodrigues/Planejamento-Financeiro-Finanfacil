document.addEventListener("DOMContentLoaded", function () {
    const editTaskModal = document.getElementById("editTaskModal");

    if (editTaskModal) {
        editTaskModal.addEventListener("show.bs.modal", function (event) {
            const button = event.relatedTarget; // Botão que acionou o modal

            // Preencher os campos do modal com os dados do botão
            const taskId = document.getElementById("taskId");
            const taskTitle = document.getElementById("taskTitle");
            const taskValue = document.getElementById("taskValue");
            const taskDate = document.getElementById("taskDate");
            const taskCategory = document.getElementById("taskCategory");

            if (taskId) taskId.value = button.getAttribute("data-id");
            if (taskTitle) taskTitle.value = button.getAttribute("data-title");
            if (taskValue) taskValue.value = button.getAttribute("data-value");
            if (taskDate) taskDate.value = button.getAttribute("data-date");

            const categoriaId = button.getAttribute("data-categoria");
            if (taskCategory) {
                Array.from(taskCategory.options).forEach(option => {
                    option.selected = option.value === categoriaId;
                });
            }
        });
    }
});