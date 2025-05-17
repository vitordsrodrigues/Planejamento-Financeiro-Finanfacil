document.addEventListener("DOMContentLoaded", function () {
    const editTaskModal = document.getElementById("editTaskModal");

    if (editTaskModal) {
        editTaskModal.addEventListener("show.bs.modal", function (event) {
            const button = event.relatedTarget;

            document.getElementById("taskId").value = button.getAttribute("data-id");
            document.getElementById("taskTitle").value = button.getAttribute("data-title");
            document.getElementById("taskValue").value = button.getAttribute("data-value");
            document.getElementById("taskDate").value = button.getAttribute("data-date");

            const categoriaId = button.getAttribute("data-categoria");
            const categoriaSelect = document.getElementById("taskCategory");

            if (categoriaSelect) {
                Array.from(categoriaSelect.options).forEach(option => {
                    option.selected = option.value === categoriaId;
                });
            }
        });
    }
});
