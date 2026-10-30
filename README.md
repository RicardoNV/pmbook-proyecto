# Smart Collar — primera etapa

Webapp de una mascota con mapa, pulso y captura manual. HTML semántico, Tailwind CSS compilado y JavaScript sin framework. Los datos de Max y del collar SC-001 son ejemplos, no mediciones reales.

## Ejecutar

Necesitas Node.js 20.19+ o 22.12+ y npm. El proyecto utiliza Vite con HTML y JavaScript, sin framework.

```powershell
npm install
npm run dev
```

Abre http://127.0.0.1:5173. `npm start` también inicia Vite. Si PowerShell bloquea `npm.ps1`, usa `npm.cmd` en lugar de `npm`. Para una instalación reproducible con el archivo de bloqueo incluido, utiliza `npm ci`.

Vite actualiza el navegador al guardar cambios y procesa Tailwind automáticamente. No necesitas ejecutar un segundo proceso para compilar CSS. Las recargas completas reinician los datos de demostración que se mantienen en memoria.

## Compilar y revisar la version final

```powershell
npm run build
npm run preview
```

La compilación genera `dist/`, con HTML, CSS, JavaScript y recursos listos para un alojamiento estático. La vista previa se abre en http://127.0.0.1:4174 y requiere compilar previamente; no es un servidor de producción. Para alojar sin Vite sirve el contenido de `dist/`, no la carpeta de fuentes. No abras los archivos mediante `file://`.

El servidor de desarrollo solo escucha en el equipo local. Los puertos son fijos: si uno está ocupado, detén el proceso anterior o cambia el puerto en `vite.config.js`.

## Archivos

- `index.html`: estructura del panel y formulario accesible.
- `src/styles.css`: entrada de Tailwind, colores, componentes y diseño adaptable.
- `vite.config.js`: integración de Tailwind, puertos y rutas relativas de compilación.
- `dist/`: resultado generado por Vite; no editar directamente ni incluir en Git.
- `assets/js/data.js`: datos de ejemplo, validación y antigüedad de lecturas.
- `assets/js/app.js`: formulario, presentación y estado en memoria.
- `assets/js/map.js`: mapa Leaflet y marcador de coordenadas.
- `assets/js/navigation.js`: barra lateral adaptable, rutas por hash y navegación con teclado.
- `assets/js/pet.js`: perfil de ejemplo, diálogo de edición, eliminación y restauración en memoria.
- `assets/images/mascota-demo.jpg`: fotografía local de la mascota de prueba.
- Leaflet se importa desde npm en `assets/js/map.js`; Vite empaqueta la biblioteca y su CSS.
- `assets/vendor/leaflet/`, `assets/css/styles.css` y `scripts/`: archivos conservados del flujo anterior; Vite ya no los utiliza para servir o compilar la aplicación.
- `tests/data.test.mjs`: pruebas de validación y estados de lectura.

Durante el desarrollo basta con mantener `npm run dev` abierto. Ejecuta `npm run build` cuando necesites actualizar `dist/`. Ejecuta las pruebas con `npm test`.

## Uso

1. El panel inicia con coordenadas de ejemplo en el área de San Nicolás de los Garza y 84 lpm; ambas fechas corresponden al momento de abrirlo.
2. Capturar lectura abre el formulario con los valores actuales. Introduce coordenadas y pulso con sus fechas independientes.
3. Guardar valida y sustituye el estado del panel. Cancelar o Escape descarta los cambios del formulario.
4. Vaciar campos seguido de Guardar permite probar el estado sin datos. También puedes dejar vacíos únicamente el pulso o ambas coordenadas.
5. Restablecer ejemplo recupera los valores iniciales con fecha actual.

Las fechas usan la zona horaria del navegador. Una lectura pasa a desactualizada al cumplir cinco minutos: es una regla demostrativa de frescura, no un criterio clínico ni una frecuencia confirmada del hardware. El temporizador solo se programa para el próximo vencimiento y se suspende cuando la pestaña queda oculta.

No hay base de datos, almacenamiento persistente, autenticación ni comunicación con el collar. Recargar vuelve a los ejemplos. Nunca se utiliza la geolocalización del navegador como sustituto de la ubicación de la mascota.

## Barra lateral y perfil de la mascota

La navegación tiene dos apartados: `#dashboard` y `#mascota`. Cambiar de apartado conserva los datos durante la sesión y permite utilizar los botones Atrás y Adelante del navegador. La barra se puede contraer en escritorio; en pantallas de hasta 1100 px se convierte en un menú deslizante con fondo oscurecido, foco contenido y cierre con Escape, botón o clic fuera. Las animaciones respetan la preferencia de movimiento reducido.

La ficha muestra a Max, un beagle de ejemplo, con nombre, raza, edad, sexo, peso, tamaño, pelaje, responsable y collar. Editar datos precarga los valores actuales y abre un diálogo nativo con `showModal()`, siguiendo el mismo mecanismo del formulario de lecturas. Guardar sincroniza la ficha, la barra lateral y la identificación en el Dashboard y el mapa. Cancelar o Escape descarta la edición. La fotografía y el tamaño mediano son fijos en esta etapa.

Eliminar pide confirmación y quita el perfil y sus lecturas solo de la memoria de la sesión. La captura queda deshabilitada hasta restaurar la mascota de ejemplo. Restaurar recupera el perfil y las lecturas iniciales con fecha actual. Recargar también recupera los datos originales.

Foto de prueba: [Lera Mk, Close-up Photo of Beagle, Pexels](https://www.pexels.com/photo/close-up-photo-of-beagle-8336043/), utilizada bajo la [licencia de Pexels](https://www.pexels.com/license/). Se guarda localmente una versión de 600 px de ancho para que la ficha no dependa de solicitudes de imagen externas.

## Mapa y conectividad

Leaflet 1.9.4 se sirve localmente. La cartografía se solicita por HTTPS a OpenStreetMap y necesita internet; conserva su atribución. Si falla, el panel mantiene las coordenadas y comunica la incidencia. El proveedor recibe las solicitudes de las teselas del área visualizada. No hay claves de API ni descarga masiva de mapas.

Antes de publicar o escalar, revisar la política del proveedor y elegir un servicio adecuado al tráfico: https://operations.osmfoundation.org/policies/tiles/. No se ha publicado este proyecto.

## Integración futura

El estado separa `location: { latitude, longitude, recordedAt }` y `pulse: { bpm, recordedAt }`; cualquiera puede ser `null`. Las fechas internas son ISO 8601. Esta separación permite sustituir los datos manuales cuando se definan los modelos de GPS, PPG, placa y protocolo del collar. No se inventan batería, diagnósticos, precisión ni conectividad real.

El criterio del acta de respuesta menor a dos segundos y las pruebas físicas del sistema requieren medición posterior en condiciones definidas; no se consideran certificados por este prototipo.
