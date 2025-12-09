/* ==========================================================
   APP DE INVENTARIO ASULATINA
   - Bootstrap 5 + XLSX local
   - PWA lista para GitHub Pages
   - Inventario editable + persistencia en localStorage
   - Filtro de búsqueda
   - Configuración de encabezado
   - Confirmación de borrado y limpieza total
   - Resumen de inventario
   - Version del sistema desde Service Worker
   ========================================================== */

/* ==========================================================
   ESTADO GLOBAL Y REFERENCIAS DEL DOM
   ========================================================== */

// Estado principal del inventario en memoria.
let inventario = [];

// Claves de almacenamiento local
const STORAGE_KEY_INVENTARIO = "inventario_asulatina_datos";
const STORAGE_KEY_TEMA = "inventario_asulatina_tema";
const STORAGE_KEY_CONFIG = "inventario_asulatina_config";

// Filtro de texto actual
let filtroTexto = "";

// Configuración de encabezado
const CONFIG_POR_DEFECTO = {
  preparadoPor: "DANIEL FLORES",
  bodega: "0018  BODEGA PEREZ ZELEDON"
};
let configuracion = { ...CONFIG_POR_DEFECTO };

// Elementos del DOM
const tablaBody = document.querySelector("#tablaInventario tbody");
const inputExcel = document.getElementById("inputExcel");
const btnDescargar = document.getElementById("btnDescargar");
const btnNuevo = document.getElementById("btnNuevo");
const btnLimpiarTodo = document.getElementById("btnLimpiarTodo");
const btnConfig = document.getElementById("btnConfig");
const inputBusqueda = document.getElementById("inputBusqueda");
const resumenInventario = document.getElementById("resumenInventario");

const formProducto = document.getElementById("formProducto");
const modalProductoElement = document.getElementById("modalProducto");
const modalProductoTitulo = document.getElementById("modalProductoTitulo");
const btnGuardarProducto = document.getElementById("btnGuardarProducto");
const indiceProductoInput = document.getElementById("indiceProducto");

const inputCodigo = document.getElementById("codigo");
const inputProducto = document.getElementById("producto");
const inputExistencia = document.getElementById("existencia");
const inputFisico = document.getElementById("fisico");

const formConfig = document.getElementById("formConfig");
const inputConfigPreparadoPor = document.getElementById("configPreparadoPor");
const inputConfigBodega = document.getElementById("configBodega");
const modalConfigElement = document.getElementById("modalConfig");

const modalConfirmLimpiarElement = document.getElementById("modalConfirmLimpiar");
const btnConfirmarLimpiar = document.getElementById("btnConfirmarLimpiar");

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
const modalConfig = bootstrap.Modal.getOrCreateInstance(modalConfigElement);
const modalConfirmLimpiar = modalConfirmLimpiarElement
  ? bootstrap.Modal.getOrCreateInstance(modalConfirmLimpiarElement)
  : null;

/* ==========================================================
   UTILITARIOS GENERALES
   ========================================================== */

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

function formatearFechaCorta(fecha) {
  const d = fecha.getDate().toString().padStart(2, "0");
  const m = (fecha.getMonth() + 1).toString().padStart(2, "0");
  const y = fecha.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatearFechaArchivo(fecha) {
  const d = fecha.getDate().toString().padStart(2, "0");
  const m = (fecha.getMonth() + 1).toString().padStart(2, "0");
  const y = fecha.getFullYear();
  return `${y}-${m}-${d}`;
}

/* ==========================================================
   TEMA CLARO / OSCURO
   ========================================================== */

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

function cargarTemaInicial() {
  const temaGuardado = localStorage.getItem(STORAGE_KEY_TEMA);
  if (temaGuardado === "oscuro" || temaGuardado === "claro") {
    aplicarTema(temaGuardado);
  } else {
    aplicarTema("claro");
  }
}

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

function guardarInventarioLocal() {
  try {
    localStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(inventario));
  } catch (error) {
    console.error("No se pudo guardar el inventario en localStorage:", error);
  }
}

function cargarInventarioLocal() {
  try {
    const texto = localStorage.getItem(STORAGE_KEY_INVENTARIO);
    if (!texto) return;

    const datos = JSON.parse(texto);
    if (!Array.isArray(datos)) return;

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

function guardarConfigLocal() {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(configuracion));
  } catch (error) {
    console.error("No se pudo guardar la configuración en localStorage:", error);
  }
}

function cargarConfigLocal() {
  try {
    const texto = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!texto) {
      configuracion = { ...CONFIG_POR_DEFECTO };
      return;
    }
    const datos = JSON.parse(texto);
    configuracion = {
      preparadoPor: (datos.preparadoPor ?? CONFIG_POR_DEFECTO.preparadoPor)
        .toString()
        .trim(),
      bodega: (datos.bodega ?? CONFIG_POR_DEFECTO.bodega).toString().trim()
    };
  } catch (error) {
    console.error("No se pudo cargar la configuración desde localStorage:", error);
    configuracion = { ...CONFIG_POR_DEFECTO };
  }
}

/* ==========================================================
   FILTRO DE BÚSQUEDA
   ========================================================== */

function coincideFiltro(item) {
  if (!filtroTexto) return true;

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
   RENDERIZADO DE TABLA Y RESUMEN
   ========================================================== */

function renderResumen() {
  if (!resumenInventario) return;

  let totalFilas = 0;
  let sumaExistencia = 0;

  inventario.forEach((item) => {
    if (!coincideFiltro(item)) return;
    totalFilas += 1;
    sumaExistencia += normalizarNumero(item.existencia);
  });

  resumenInventario.textContent =
    totalFilas === 0
      ? "Sin registros."
      : `Registros: ${totalFilas} · Existencia total: ${sumaExistencia}`;
}

function renderTabla() {
  tablaBody.innerHTML = "";

  inventario.forEach((item, index) => {
    if (!coincideFiltro(item)) return;

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

  renderResumen();
}

/* ==========================================================
   ACCIONES EN LA TABLA
   ========================================================== */

tablaBody.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-action]");
  if (!boton) return;

  const accion = boton.getAttribute("data-action");
  const indice = Number(boton.getAttribute("data-index"));

  if (Number.isNaN(indice) || indice < 0 || indice >= inventario.length) {
    return;
  }

  if (accion === "eliminar") {
    const confirmar = window.confirm(
      "¿Deseas eliminar este registro del inventario?"
    );
    if (!confirmar) return;

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

inputExcel.addEventListener("change", (evento) => {
  const archivo = evento.target.files[0];
  if (!archivo) return;

  const lector = new FileReader();

  lector.onload = (e) => {
    try {
      const datos = new Uint8Array(e.target.result);
      const workbook = XLSX.read(datos, { type: "array" });

      const nombreHoja = workbook.SheetNames[0];
      const hoja = workbook.Sheets[nombreHoja];

      const opciones = {
        range: 13, // Fila 14 (0-based)
        defval: ""
      };

      const filas = XLSX.utils.sheet_to_json(hoja, opciones);

      inventario = filas
        .map((fila) => {
          const codigo = (fila["Codigo"] ?? "").toString().trim();
          const producto = (fila["Producto"] ?? "").toString().trim();
          const existencia = normalizarNumero(fila["Existencia"]);
          const fisico = normalizarNumero(fila["Físico"]);

          return { codigo, producto, existencia, fisico };
        })
        .filter((fila) => fila.codigo !== "" || fila.producto !== "");

      guardarInventarioLocal();
      renderTabla();
      mostrarToast(
        `Archivo cargado correctamente. Registros leídos: ${inventario.length}`
      );
    } catch (error) {
      console.error(error);
      mostrarToast("Error leyendo el archivo de Excel", true);
    } finally {
      inputExcel.value = "";
    }
  };

  lector.onerror = () => {
    mostrarToast("No se pudo leer el archivo seleccionado", true);
    inputExcel.value = "";
  };

  lector.readAsArrayBuffer(archivo);
});

/* ==========================================================
   FORMULARIO CREAR / EDITAR PRODUCTO
   ========================================================== */

btnNuevo.addEventListener("click", () => {
  indiceProductoInput.value = "-1";
  formProducto.reset();
  modalProductoTitulo.textContent = "Nuevo producto";
  btnGuardarProducto.textContent = "Guardar";
  modalProducto.show();
});

formProducto.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const codigo = inputCodigo.value.trim();
  const producto = inputProducto.value.trim();
  const existencia = normalizarNumero(inputExistencia.value);
  const fisico = normalizarNumero(inputFisico.value);
  const indice = Number(indiceProductoInput.value);

  if (codigo === "" || producto === "") {
    mostrarToast("Código y producto son obligatorios", true);
    return;
  }
  if (existencia < 0 || fisico < 0) {
    mostrarToast("Existencia y físico no pueden ser negativos", true);
    return;
  }

  const indiceExistente = inventario.findIndex(
    (item, idx) =>
      idx !== indice && item.codigo.toString().trim() === codigo
  );

  if (indice === -1 || Number.isNaN(indice)) {
    if (indiceExistente !== -1) {
      const sobrescribir = window.confirm(
        "Ya existe un producto con ese código. ¿Deseas sobrescribirlo?"
      );
      if (sobrescribir) {
        inventario[indiceExistente] = { codigo, producto, existencia, fisico };
        mostrarToast("Producto actualizado (código existente)");
      } else {
        mostrarToast("No se guardó el producto porque el código ya existe", true);
        return;
      }
    } else {
      inventario.push({ codigo, producto, existencia, fisico });
      mostrarToast("Producto agregado al inventario");
    }
  } else {
    if (indiceExistente !== -1) {
      const sobrescribirEdicion = window.confirm(
        "Ya existe otro producto con ese código. ¿Deseas usar ese código de todas formas?"
      );
      if (!sobrescribirEdicion) {
        mostrarToast("No se guardaron los cambios por código duplicado", true);
        return;
      }
    }
    inventario[indice] = { codigo, producto, existencia, fisico };
    mostrarToast("Producto actualizado");
  }

  guardarInventarioLocal();
  renderTabla();
  modalProducto.hide();
});

/* ==========================================================
   BOTÓN LIMPIAR INVENTARIO
   ========================================================== */

btnLimpiarTodo.addEventListener("click", () => {
  if (!modalConfirmLimpiar) {
    const confirmacion = window.confirm(
      "Esta acción eliminará todo el inventario cargado o ingresado manualmente. ¿Deseas continuar?"
    );
    if (!confirmacion) return;

    inventario = [];
    guardarInventarioLocal();
    renderTabla();
    mostrarToast("Inventario limpiado completamente");
    return;
  }

  modalConfirmLimpiar.show();
});

if (btnConfirmarLimpiar) {
  btnConfirmarLimpiar.addEventListener("click", () => {
    inventario = [];
    guardarInventarioLocal();
    renderTabla();
    mostrarToast("Inventario limpiado completamente");

    if (modalConfirmLimpiar) {
      modalConfirmLimpiar.hide();
    }
  });
}

/* ==========================================================
   CONFIGURACIÓN DE ENCABEZADO
   ========================================================== */

btnConfig.addEventListener("click", () => {
  inputConfigPreparadoPor.value = configuracion.preparadoPor;
  inputConfigBodega.value = configuracion.bodega;
  modalConfig.show();
});

formConfig.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const preparado = inputConfigPreparadoPor.value.trim();
  const bodega = inputConfigBodega.value.trim();

  if (preparado === "" || bodega === "") {
    mostrarToast("Ambos campos de configuración son obligatorios", true);
    return;
  }

  configuracion.preparadoPor = preparado;
  configuracion.bodega = bodega;
  guardarConfigLocal();
  modalConfig.hide();
  mostrarToast("Configuración guardada");
});

/* ==========================================================
   DESCARGA DE EXCEL CON PLANTILLA
   ========================================================== */

btnDescargar.addEventListener("click", () => {
  try {
    const hoy = new Date();
    const fechaTexto = formatearFechaCorta(hoy);
    const fechaArchivo = formatearFechaArchivo(hoy);

    const datosTabla = inventario.map((item) => ({
      Codigo: item.codigo,
      Producto: item.producto,
      Existencia: item.existencia,
      "Físico": item.fisico
    }));

    const encabezado = [
      [],
      [],
      [],
      [],
      [],
      [null, "ASULATINA"],
      [`al :${fechaTexto}`],
      ["Preparado por: ", configuracion.preparadoPor],
      ["Fecha: ", hoy],
      [],
      [null, "Existencias del Inventario"],
      [],
      ["Bodega", configuracion.bodega],
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
   SERVICE WORKER / PWA Y VERSIÓN DEL SISTEMA
   ========================================================== */

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "VERSION" && swVersionElement) {
      swVersionElement.textContent = `Version del sistema: ${event.data.version}`;
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
            "Version del sistema: registrando...";
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
          swVersionElement.textContent =
            "Version del sistema: error al registrar";
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
cargarConfigLocal();
cargarInventarioLocal();
renderTabla();
