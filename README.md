# Inventario Asulatina

Aplicación web (PWA) para gestionar inventarios basada en la plantilla de Excel de ASULATINA.  
Funciona en computadora y en dispositivos móviles (Android / iOS) y puede instalarse como aplicación.

La aplicación trabaja completamente en el navegador y guarda la información en el propio dispositivo del usuario.

---

## Características principales

- Carga de inventario desde un archivo Excel con la plantilla de ASULATINA.
- Edición manual de productos (agregar, editar y eliminar).
- Descarga de un nuevo archivo Excel con el inventario actualizado respetando la estructura original.
- Búsqueda en tiempo real por código, producto, existencia o físico.
- Resumen de registros y existencia total.
- Configuración del encabezado del reporte:
  - Campo "Preparado por".
  - Campo "Bodega".
- Tema claro y oscuro con interruptor y preferencia guardada.
- Modo PWA:
  - Se puede instalar en Android, iOS y escritorio.
  - Funciona sin conexión después de la primera carga.
- Datos guardados en el navegador mediante almacenamiento local.

---

## Flujo de trabajo

1. **Abrir la aplicación**  
   El usuario abre la URL publicada (por ejemplo, en GitHub Pages) desde el navegador.

2. **Cargar inventario (opcional)**  
   - El usuario puede seleccionar un archivo Excel con la plantilla de ASULATINA.
   - El sistema lee los productos y los muestra en la tabla.
   - También es posible empezar con la tabla vacía e ir agregando productos manualmente.

3. **Gestionar productos**
   - **Nuevo registro**: abre un formulario para agregar un producto con:
     - Código
     - Producto
     - Existencia
     - Físico
   - **Editar**: cada fila tiene un botón para modificar los datos.
   - **Eliminar**: cada fila tiene un botón para borrar el registro (se pide confirmación).

4. **Filtro de búsqueda**
   - Un campo de texto permite filtrar rápidamente por cualquier dato:
     - Código
     - Producto
     - Existencia
     - Físico
   - El resumen superior se actualiza según el filtro activo.

5. **Configuración de encabezado**
   - Desde el botón "Configuración" se define:
     - Nombre de la persona que prepara el reporte.
     - Texto de la bodega.
   - Esta configuración se guarda en el navegador y se usa al generar el Excel.

6. **Descargar inventario en Excel**
   - El botón "Descargar Excel" genera un archivo con:
     - El encabezado de la plantilla original.
     - Los productos actualmente visibles en el sistema.
   - El archivo sigue el formato esperado por ASULATINA.

7. **Limpieza de inventario**
   - El botón "Limpiar inventario" borra todos los registros actuales
     (se pide confirmación antes de hacerlo).

---

## Almacenamiento de datos

- El inventario cargado o ingresado manualmente se guarda en el navegador mediante `localStorage`.
- La configuración de encabezado (bodega y preparado por) también se guarda en `localStorage`.
- Esto significa:
  - Los datos se mantienen aunque se cierre el navegador.
  - Los datos no se comparten entre dispositivos (cada dispositivo tiene su copia).

---

## Tema claro / oscuro

- En la parte superior hay un interruptor "Oscuro".
- El usuario puede cambiar entre tema claro y tema oscuro.
- La aplicación recuerda la preferencia y la aplica automáticamente en la siguiente visita.

---

## PWA (aplicación instalable)

- La aplicación está preparada como PWA:
  - Tiene `manifest.json` con iconos y configuración.
  - Tiene un `service-worker` que cachea los recursos principales.
- Una vez instalada o cargada al menos una vez:
  - Puede seguir funcionando sin conexión.
  - Permite generar y descargar Excel offline, porque la librería XLSX está en el propio proyecto.

---

## Versión del sistema

- La versión activa del `service-worker` se muestra en el pie de página como:
  - `Version del sistema: vX.Y.Z`
- Cada vez que se actualiza el `service-worker` se debe cambiar el número de versión en el archivo correspondiente.

---

## Despliegue

1. Subir todos los archivos del proyecto a un servidor estático (por ejemplo GitHub Pages).
2. Asegurarse de que:
   - `index.html` esté en la raíz.
   - La carpeta `assets` incluya los archivos:
     - `bootstrap.min.css`
     - `bootstrap.bundle.min.js`
     - `xlsx.full.min.js`
     - `favicon.png`
3. Abrir la URL desde el navegador y verificar:
   - Carga de la aplicación.
   - Carga y descarga de Excel.
   - Modo claro/oscuro.
   - Texto de versión del sistema en el footer.
