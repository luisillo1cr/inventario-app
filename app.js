/* ==========================================================
   APP DE INVENTARIO ASULATINA
   Frontend puro con Bootstrap 5 + XLSX
   Compatible con la plantilla de Excel proporcionada
   ========================================================== */

// Estado principal del inventario en memoria
// Estructura interna por fila:
// { codigo: string, producto: string, existencia: number, fisico: number }
let inventario = [];

// Referencias a elementos del DOM
const tablaBody = document.querySelector("#tablaInventario tbody");
const inputExcel = document.getElementById("inputExcel");
const btnDescargar = document.getElementById("btnDescargar");
const formNuevo = document.getElementById("formNuevo");
const toastElement = document.getElementById("toastApp");
const toastBody = toastElement.querySelector(".toast-body");

// Instancia de Toast de Bootstrap (se reutiliza para todos los mensajes)
const toastApp = new bootstrap.Toast(toastElement);

/* ==========================================================
   UTILITARIOS
   ========================================================== */

/**
 * Normaliza un valor numérico que puede venir como número,
 * texto con coma/punto o vacío. Devuelve siempre un number.
 */
function normalizarNumero(valor) {
  if (typeof valor === "number") {
    return valor;
  }

  if (typeof valor === "string") {
    const limpio = valor.trim();

    if (limpio === "") {
      return 0;
    }

    // Reemplazo simple para números con separadores comunes
    const estandarizado = limpio.replace(/\./g, "").replace(",", ".");
    const convertido = Number(estandarizado);

    return Number.isNaN(convertido) ? 0 : convertido;
  }

  return 0;
}

/**
 * Muestra un mensaje en el toast de la aplicación.
 */
function mostrarToast(mensaje, esError = false) {
  // Cambiar la cabecera según si es error o no
  const header = toastElement.querySelector(".toast-header");
  if (esError) {
    header.classList.remove("toast-header-success");
    header.classList.add("toast-header-error");
  } else {
    header.classList.remove("toast-header-error");
    header.classList.add("toast-header-success");
  }

  toastBody.textContent = mensaje;
  toastApp.show();
}

/**
 * Formatea una fecha en formato dd/mm/yyyy (para encabezado).
 */
function formatearFechaCorta(fecha) {
  const d = fecha.getDate().toString().padStart(2, "0");
  const m = (fecha.getMonth() + 1).toString().padStart(2, "0");
  const y = fecha.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Formato de fecha para el nombre del archivo: yyyy-mm-dd
 */
function formatearFechaArchivo(fecha) {
  const d = fecha.getDate().toString().padStart(2, "0");
  const m = (fecha.getMonth() + 1).toString().padStart(2, "0");
  const y = fecha.getFullYear();
  return `${y}-${m}-${d}`;
}

/* ==========================================================
   RENDERIZADO DE LA TABLA
   ========================================================== */

/**
 * Renderiza todo el inventario actual en la tabla.
 */
function renderTabla() {
  tablaBody.innerHTML = "";

  inventario.forEach((item, index) => {
    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>${item.codigo ?? ""}</td>
      <td>${item.producto ?? ""}</td>
      <td>${item.existencia ?? ""}</td>
      <td>${item.fisico ?? ""}</td>
      <td>
        <button
          class="btn btn-danger btn-sm"
          data-index="${index}"
        >
          Eliminar
        </button>
      </td>
    `;

    tablaBody.appendChild(fila);
  });
}

/**
 * Maneja el click en el botón "Eliminar" usando delegación de eventos.
 */
tablaBody.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-index]");
  if (!boton) {
    return;
  }

  const index = Number(boton.getAttribute("data-index"));
  if (Number.isNaN(index)) {
    return;
  }

  inventario.splice(index, 1);
  renderTabla();
  mostrarToast("Registro eliminado correctamente");
});

/* ==========================================================
   CARGA DE EXCEL
   ========================================================== */

/**
 * Lee el archivo Excel seleccionado y carga los datos en memoria.
 * Se adapta a la plantilla proporcionada:
 *   - Encabezados importantes en fila 14:
 *     "Codigo", "Producto", "Existencia", "Físico"
 *   - Los datos inician en la fila 15.
 */
inputExcel.addEventListener("change", (evento) => {
  const archivo = evento.target.files[0];

  if (!archivo) {
    return;
  }

  const lector = new FileReader();

  lector.onload = (e) => {
    try {
      const datos = new Uint8Array(e.target.result);

      // Leer workbook completo
      const workbook = XLSX.read(datos, { type: "array" });

      // Usamos siempre la primera hoja
      const nombreHoja = workbook.SheetNames[0];
      const hoja = workbook.Sheets[nombreHoja];

      // range: 13 => fila 14 (0-based) donde están los encabezados de la tabla
      const opciones = {
        range: 13,
        defval: ""
      };

      const filas = XLSX.utils.sheet_to_json(hoja, opciones);

      // Convertimos cada fila a nuestra estructura interna
      inventario = filas
        .map((fila) => {
          const codigo = (fila["Codigo"] ?? "").toString().trim();
          const producto = (fila["Producto"] ?? "").toString().trim();
          const existencia = normalizarNumero(fila["Existencia"]);
          const fisico = normalizarNumero(fila["Físico"]);

          return {
            codigo,
            producto,
            existencia,
            fisico
          };
        })
        // Filtramos filas realmente vacías
        .filter((fila) => fila.codigo !== "" || fila.producto !== "");

      renderTabla();
      mostrarToast("Archivo de inventario cargado correctamente");
    } catch (error) {
      console.error(error);
      mostrarToast("Error leyendo el archivo de Excel", true);
    }
  };

  lector.onerror = () => {
    mostrarToast("No se pudo leer el archivo seleccionado", true);
  };

  lector.readAsArrayBuffer(archivo);
});

/* ==========================================================
   FORMULARIO: NUEVO REGISTRO
   ========================================================== */

formNuevo.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const codigoInput = document.getElementById("codigo");
  const productoInput = document.getElementById("producto");
  const existenciaInput = document.getElementById("existencia");
  const fisicoInput = document.getElementById("fisico");

  const nuevoItem = {
    codigo: codigoInput.value.trim(),
    producto: productoInput.value.trim(),
    existencia: normalizarNumero(existenciaInput.value),
    fisico: normalizarNumero(fisicoInput.value)
  };

  inventario.push(nuevoItem);
  renderTabla();

  mostrarToast("Producto agregado al inventario");

  formNuevo.reset();

  // Cerrar modal de forma programática
  const modalElement = document.getElementById("modalNuevo");
  const instanciaModal = bootstrap.Modal.getInstance(modalElement);
  if (instanciaModal) {
    instanciaModal.hide();
  }
});

/* ==========================================================
   DESCARGA DE EXCEL (PLANTILLA ASULATINA)
   ========================================================== */

btnDescargar.addEventListener("click", () => {
  try {
    const hoy = new Date();
    const fechaTexto = formatearFechaCorta(hoy);
    const fechaArchivo = formatearFechaArchivo(hoy);

    // Datos que irán en la tabla del Excel
    const datosTabla = inventario.map((item) => ({
      Codigo: item.codigo,
      Producto: item.producto,
      Existencia: item.existencia,
      "Físico": item.fisico
    }));

    // Encabezado según la plantilla compartida
    const encabezado = [
      [], // fila 1
      [], // fila 2
      [], // fila 3
      [], // fila 4
      [], // fila 5
      [null, "ASULATINA"], // fila 6
      [`al :${fechaTexto}`], // fila 7
      ["Preparado por: ", "DANIEL FLORES"], // fila 8
      ["Fecha: ", hoy], // fila 9
      [], // fila 10
      [null, "Existencias del Inventario"], // fila 11
      [], // fila 12
      ["Bodega", "0018  BODEGA PEREZ ZELEDON"], // fila 13
      ["Codigo", "Producto", "Existencia", "Físico"] // fila 14
      // fila 15 en adelante: datos
    ];

    // Creamos la hoja con el encabezado
    const hoja = XLSX.utils.aoa_to_sheet(encabezado);

    // Agregamos los datos desde la fila 15 (A15) sin volver a escribir encabezados
    XLSX.utils.sheet_add_json(hoja, datosTabla, {
      origin: "A15",
      skipHeader: true
    });

    // Creamos el libro y agregamos la hoja
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, hoja, "Hoja1");

    // Nombre de archivo similar a los que usas
    const nombreArchivo = `INV_PEREZ_ZELEDON_${fechaArchivo}.xlsx`;

    XLSX.writeFile(workbook, nombreArchivo);
    mostrarToast("Archivo de Excel generado correctamente");
  } catch (error) {
    console.error(error);
    mostrarToast("Error generando el archivo de Excel", true);
  }
});

/* ==========================================================
   SERVICE WORKER / PWA
   ========================================================== */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((error) => {
        console.error("Error registrando el service worker:", error);
      });
  });
}
