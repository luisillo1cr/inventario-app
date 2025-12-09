/* ==========================================================
   APP DE INVENTARIO ASULATINA
   - Bootstrap 5 + XLSX
   - PWA lista para GitHub Pages
   - Inventario editable + persistencia en localStorage
   - Filtro de búsqueda
   - Lectura de versión del Service Worker
   ========================================================== */

/* ==========================================================
   ESTADO GLOBAL Y REFERENCIAS DEL DOM
   ========================================================== */

// Estado principal del inventario en memoria.
// Cada item tiene la forma:
// { codigo: string, producto: string, existencia: number, fisico: number }
let inventario = [];

// Claves para almacenamiento local
const STORAGE_KEY_INVENTARIO = "inventario_asulatina_datos";
const STORAGE_KEY_TEMA = "inventario_asulatina_tema";

// Filtro de texto actual
let filtroTexto = "";

// Elementos del DOM
const tablaBody = document.querySelector("#tablaInventario tbody");
const inputExcel = document.getElementById("inputExcel");
const btnDescargar = document.getElementById("btnDescargar");
const btnNuevo = document.getElementById("btnNuevo");
const inputBusqueda = document.getElementById("inputBusqueda");

const formProducto = document.getElementById("formProducto");
const modalProductoElement = document.getElementById("modalProducto");
const modalProductoTitulo = document.getElementById("modalProductoTitulo");
const btnGuardarProducto = document.getElementById("btnGuardarProducto");
const indiceProductoInput = document.getElementById("indiceProducto");

const inputCodigo = document.getElementById("codigo");
const inputProducto = document.getElementById("producto");
const inputExistencia = document.getElementById("existencia");
const inputFisico = document.getElementById("fisico");

const toastElement = document.getElementById("toastApp");
const toastBody = toastElement.querySelector(".toast-body");
const toggleTema = document.getElementById("toggleTema");
const swVersionElement = document.getElementById("swVersion");

// Instancias de Bootstrap
const toastApp = new bootstrap.Toast(toastElement, {
  delay: 3500,
  autohide: true
});
const modalProducto = bootstrap.Modal.getOrCreateInstance(modalProductoElement);

/* ==========================================================
   UTILITARIOS GENERALES
   ========================================================== */

/**
 * Convierte un valor a número, manejando comas, puntos y vacíos.
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
    const estandarizado = limpio.replace(/\./g, "").replace(",", ".");
    const convertido = Number(estandarizado);
    return Number.isNaN(convertido) ? 0 : convertido;
  }

  return 0;
}

/**
 * Muestra un mensaje de notificación en el toast.
 * esError = true aplica estilo de error.
 */
function mostrarToast(mensaje, esError = false) {
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
 * Devuelve fecha dd/mm/yyyy para encabezado.
 */
function formatearFechaCorta(fecha) {
  const d = fecha.getDate().toString().padStart(2, "0");
  const m = (fecha.getMonth() + 1).toString().padStart(2, "0");
  const y = fecha.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Devuelve fecha yyyy-mm-dd para nombre de archivo.
 */
function formatearFechaArchivo(fecha) {
  const d = fecha.getDate().toString().padStart(2, "0");
  const m = (fecha.getMonth() + 1).toString().padStart(2, "0");
  const y = fecha.getFullYear();
  return `${y}-${m}-${d}`;
}

/* ==========================================================
   TEMA CLARO / OSCURO
   ========================================================== */

/**
 * Aplica el tema indicado al body y al switch.
 */
function aplicarTema(tema) {
  if (tema === "oscuro") {
    document.body.classList.add("tema-oscuro");
    document.body.classList.remove("tema-claro");
    if (toggleTema) {
      toggleTema.checked = true;
    }
  } else {
    document.body.classList.add("tema-claro");
    document.body.classList.remove("tema-oscuro");
    if (toggleTema) {
      toggleTema.checked = false;
    }
  }
}

/**
 * Carga el tema desde localStorage, o usa claro por defecto.
 */
function cargarTemaInicial() {
  const temaGuardado = localStorage.getItem(STORAGE_KEY_TEMA);
  if (temaGuardado === "oscuro" || temaGuardado === "claro") {
    aplicarTema(temaGuardado);
  } else {
    aplicarTema("claro");
  }
}

// Manejo de cambios en el switch de tema
if (toggleTema) {
  toggleTema.addEventListener("change", () => {
    const tema = toggleTema.checked ? "oscuro" : "claro";
    aplicarTema(tema);
    try {
      localStorage.setItem(STORAGE_KEY_TEMA, tema);
    } catch (error) {
      console.error("No se pudo guardar el tema en localStorage:", error);
    }
  });
}

/* ==========================================================
   PERSISTENCIA EN LOCALSTORAGE
   ========================================================== */

/**
 * Guarda el inventario actual en localStorage.
 */
function guardarInventarioLocal() {
  try {
    localStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(inventario));
  } catch (error) {
    console.error("No se pudo guardar el inventario en localStorage:", error);
  }
}

/**
 * Carga el inventario desde localStorage, si existe.
 */
function cargarInventarioLocal() {
  try {
    const texto = localStorage.getItem(STORAGE_KEY_INVENTARIO);
    if (!texto) {
      return;
    }

    const datos = JSON.parse(texto);
    if (!Array.isArray(datos)) {
      return;
    }

    inventario = datos.map((item) => ({
      codigo: (item.codigo ?? "").toString().trim(),
      producto: (item.producto ?? "").toString().trim(),
      existencia: normalizarNumero(item.existencia),
      fisico: normalizarNumero(item.fisico)
    }));
  } catch (error) {
    console.error("No se pudo cargar el inventario desde localStorage:", error);
  }
}

/* ==========================================================
   FILTRO DE BÚSQUEDA
   ========================================================== */

/**
 * Indica si un item coincide con el filtro de texto actual.
 */
function coincideFiltro(item) {
  if (!filtroTexto) {
    return true;
  }

  const termino = filtroTexto.toLowerCase();

  const campos = [
    item.codigo ?? "",
    item.producto ?? "",
    item.existencia != null ? String(item.existencia) : "",
    item.fisico != null ? String(item.fisico) : ""
  ];

  return campos.some((campo) =>
    campo.toString().toLowerCase().includes(termino)
  );
}

if (inputBusqueda) {
  inputBusqueda.addEventListener("input", () => {
    filtroTexto = inputBusqueda.value.trim();
    renderTabla();
  });
}

/* ==========================================================
   RENDERIZADO DE TABLA
   ========================================================== */

/**
 * Dibuja la tabla completa en función del estado y el filtro actuales.
 */
function renderTabla() {
  tablaBody.innerHTML = "";

  inventario.forEach((item, index) => {
    if (!coincideFiltro(item)) {
      return;
    }

    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>${item.codigo ?? ""}</td>
      <td>${item.producto ?? ""}</td>
      <td>${item.existencia ?? ""}</td>
      <td>${item.fisico ?? ""}</td>
      <td class="text-nowrap">
        <button
          type="button"
          class="btn btn-secondary btn-sm me-1"
          data-index="${index}"
          data-action="editar"
        >
          Editar
        </button>
        <button
          type="button"
          class="btn btn-danger btn-sm"
          data-index="${index}"
          data-action="eliminar"
        >
          Eliminar
        </button>
      </td>
    `;

    tablaBody.appendChild(fila);
  });
}

/**
 * Maneja las acciones de los botones "Editar" y "Eliminar" dentro de la tabla.
 */
tablaBody.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-action]");
  if (!boton) {
    return;
  }

  const accion = boton.getAttribute("data-action");
  const indice = Number(boton.getAttribute("data-index"));

  if (Number.isNaN(indice) || indice < 0 || indice >= inventario.length) {
    return;
  }

  if (accion === "eliminar") {
    inventario.splice(indice, 1);
    guardarInventarioLocal();
    renderTabla();
    mostrarToast("Registro eliminado correctamente");
    return;
  }

  if (accion === "editar") {
    const item = inventario[indice];

    indiceProductoInput.value = String(indice);
    inputCodigo.value = item.codigo ?? "";
    inputProducto.value = item.producto ?? "";
    inputExistencia.value = item.existencia ?? 0;
    inputFisico.value = item.fisico ?? 0;

    modalProductoTitulo.textContent = "Editar producto";
    btnGuardarProducto.textContent = "Actualizar";

    modalProducto.show();
  }
});

/* ==========================================================
   CARGA DE EXCEL
   ========================================================== */

/**
 * Carga un archivo de Excel con la plantilla de Asulatina y
 * reemplaza el inventario en memoria.
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
      const workbook = XLSX.read(datos, { type: "array" });

      // Se usa la primera hoja
      const nombreHoja = workbook.SheetNames[0];
      const hoja = workbook.Sheets[nombreHoja];

      // range: 13 (fila 14, 0-based) donde está el encabezado "Codigo, Producto..."
      const opciones = {
        range: 13,
        defval: ""
      };

      const filas = XLSX.utils.sheet_to_json(hoja, opciones);

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
        .filter((fila) => fila.codigo !== "" || fila.producto !== "");

      guardarInventarioLocal();
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
   FORMULARIO CREAR / EDITAR PRODUCTO
   ========================================================== */

/**
 * Preparar modal para un nuevo registro.
 */
btnNuevo.addEventListener("click", () => {
  indiceProductoInput.value = "-1";
  formProducto.reset();
  modalProductoTitulo.textContent = "Nuevo producto";
  btnGuardarProducto.textContent = "Guardar";
  modalProducto.show();
});

/**
 * Maneja el envío del formulario. Si indiceProducto = -1 se crea un
 * nuevo registro, en caso contrario se actualiza el existente.
 */
formProducto.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const indice = Number(indiceProductoInput.value);

  const nuevoItem = {
    codigo: inputCodigo.value.trim(),
    producto: inputProducto.value.trim(),
    existencia: normalizarNumero(inputExistencia.value),
    fisico: normalizarNumero(inputFisico.value)
  };

  if (indice === -1 || Number.isNaN(indice)) {
    inventario.push(nuevoItem);
    mostrarToast("Producto agregado al inventario");
  } else {
    inventario[indice] = nuevoItem;
    mostrarToast("Producto actualizado");
  }

  guardarInventarioLocal();
  renderTabla();
  modalProducto.hide();
});

/* ==========================================================
   DESCARGA DE EXCEL CON PLANTILLA
   ========================================================== */

/**
 * Genera un archivo de Excel con el encabezado y la tabla,
 * siguiendo la estructura de la plantilla que compartiste.
 */
btnDescargar.addEventListener("click", () => {
  try {
    const hoy = new Date();
    const fechaTexto = formatearFechaCorta(hoy);
    const fechaArchivo = formatearFechaArchivo(hoy);

    // Datos para la tabla
    const datosTabla = inventario.map((item) => ({
      Codigo: item.codigo,
      Producto: item.producto,
      Existencia: item.existencia,
      "Físico": item.fisico
    }));

    // Encabezado basado en la plantilla
    const encabezado = [
      [],
      [],
      [],
      [],
      [],
      [null, "ASULATINA"],
      [`al :${fechaTexto}`],
      ["Preparado por: ", "DANIEL FLORES"],
      ["Fecha: ", hoy],
      [],
      [null, "Existencias del Inventario"],
      [],
      ["Bodega", "0018  BODEGA PEREZ ZELEDON"],
      ["Codigo", "Producto", "Existencia", "Físico"]
    ];

    const hoja = XLSX.utils.aoa_to_sheet(encabezado);

    XLSX.utils.sheet_add_json(hoja, datosTabla, {
      origin: "A15",
      skipHeader: true
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, hoja, "Hoja1");

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

/**
 * Escucha mensajes provenientes del Service Worker para conocer
 * la versión activa.
 */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "VERSION" && swVersionElement) {
      swVersionElement.textContent = `Service Worker: ${event.data.version}`;
    }
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => {
        if (swVersionElement) {
          swVersionElement.textContent =
            "Version del sistema: registrado, leyendo versión...";
        }

        function solicitarVersion() {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: "GET_VERSION"
            });
          }
        }

        solicitarVersion();

        navigator.serviceWorker.addEventListener(
          "controllerchange",
          solicitarVersion
        );
      })
      .catch((error) => {
        console.error("Error registrando el service worker:", error);
        if (swVersionElement) {
          swVersionElement.textContent = "Version del sistema: error al registrar";
        }
      });
  });
} else if (swVersionElement) {
  swVersionElement.textContent = "Version del sistema: no soportado";
}

/* ==========================================================
   INICIALIZACIÓN AL CARGAR LA PÁGINA
   ========================================================== */

cargarTemaInicial();
cargarInventarioLocal();
renderTabla();
