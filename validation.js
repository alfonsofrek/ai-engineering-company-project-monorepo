document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("trackflowForm");
    const successMessage = document.getElementById("successMessage");

    // Evita errores si este script se incluye en una página sin el formulario.
    if (!form || !successMessage) {
        return;
    }

    // Campos del formulario
    const fields = {
        fullName: document.getElementById("fullName"),
        companyName: document.getElementById("companyName"),
        email: document.getElementById("email"),
        country: document.getElementById("country"),
        phone: document.getElementById("phone"),
        monthlyVolume: document.getElementById("monthlyVolume")
    };

    // Función para mostrar un error visualmente con Tailwind
    const showError = (fieldId, message) => {
        const errorSpan = document.getElementById(`error-${fieldId}`);
        const inputField = fields[fieldId];
        
        if (errorSpan && inputField) {
            errorSpan.textContent = message;
            errorSpan.classList.remove("hidden");
            // Ponemos el borde en rojo de advertencia
            inputField.classList.remove("border-slate-300", "focus:ring-indigo-500");
            inputField.classList.add("border-rose-500", "focus:ring-rose-500");
        }
    };

    // Función para limpiar el error si el campo está bien
    const clearError = (fieldId) => {
        const errorSpan = document.getElementById(`error-${fieldId}`);
        const inputField = fields[fieldId];
        
        if (errorSpan && inputField) {
            errorSpan.classList.add("hidden");
            // Devolvemos el color original de Tailwind
            inputField.classList.remove("border-rose-500", "focus:ring-rose-500");
            inputField.classList.add("border-slate-300", "focus:ring-indigo-500");
        }
    };

    // FUNCIÓN DE VALIDACIÓN INDIVIDUAL (Estructuras de Control Condicionales)
    const validateField = (id, value) => {
        clearError(id);

        // 1. Validar que no esté vacío
        if (!value.trim()) {
            showError(id, "Este campo es obligatorio.");
            return false;
        }

        // 2. Reglas específicas por campo según CONTEXT.md
        if (id === "fullName" && value.trim().length < 3) {
            showError(id, "El nombre completo debe tener al menos 3 caracteres.");
            return false;
        }

        if (id === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                showError(id, "Introduce un correo electrónico corporativo válido.");
                return false;
            }
        }

        if (id === "monthlyVolume") {
            const volume = parseInt(value, 10);
            if (isNaN(volume) || volume <= 0) {
                showError(id, "El volumen de envíos mensuales debe ser un número entero mayor que 0.");
                return false;
            }
        }

        if (id === "phone") {
            // Validar formato internacional simple para España (+34) o México (+52)
            const phoneRegex = /^(\+34|\+52)?\s?\d{9,10}$/;
            if (!phoneRegex.test(value.replace(/\s/g, ""))) {
                showError(id, "Introduce un número de teléfono válido para México o España.");
                return false;
            }
        }

        return true;
    };

    // Escuchar eventos en tiempo real mientras el usuario escribe o sale del input
    Object.keys(fields).forEach(key => {
        fields[key].addEventListener("input", () => validateField(key, fields[key].value));
        fields[key].addEventListener("blur", () => validateField(key, fields[key].value));
    });

    // Evento de Limpiar Formulario (Reset)
    form.addEventListener("reset", () => {
        // Ocultamos todos los mensajes de error al limpiar
        Object.keys(fields).forEach(key => clearError(key));
        successMessage.classList.add("hidden");
    });

    // EVENTO DE ENVÍO DEL FORMULARIO
    form.addEventListener("submit", (event) => {
        // Detener el envío automático del formulario HTML
        event.preventDefault();

        let isFormValid = true;

        // Validar todos los campos del tirón antes de enviar
        Object.keys(fields).forEach(key => {
            const isValid = validateField(key, fields[key].value);
            if (!isValid) {
                isFormValid = false;
            }
        });

        // Si todo está correcto, simulamos el envío con éxito
        if (isFormValid) {
            successMessage.classList.remove("hidden");
            // Limpiamos campos y estilos sin disparar el evento reset que ocultaría el mensaje.
            form.querySelectorAll("input, select, textarea").forEach((field) => {
                field.value = "";
            });
            Object.keys(fields).forEach((key) => clearError(key));
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube la pantalla para ver el éxito
        }
    });
});