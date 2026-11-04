# Mascotas por cuenta

## Instalacion

1. Ejecutar completo `supabase/migrations/20261103_pets.sql` en SQL Editor una sola vez. No contiene registros de ejemplo.
2. Ejecutar completo `supabase/tests/pets_rls.sql`. Debe devolver OK. Sus usuarios y mascotas ficticios se revierten con ROLLBACK, sin correos ni cambios permanentes.
3. Iniciar sesion y abrir el panel. Una cuenta sin mascotas abre Crear mascota automaticamente.

## Modelo y decisiones

`pets.user_id` referencia `auth.users.id`. RLS protege lectura, insercion, actualizacion y eliminacion usando `auth.uid()`. El campo responsable es descriptivo y no decide permisos. Cada cuenta admite varias mascotas; no existe una restriccion de una mascota por usuario.

La ficha contiene nombre, raza, edad en años enteros, sexo, peso, tamaño, pelaje y responsable. `collar` solo admite Sin asignar y tres modelos ficticios, sin tabla de dispositivos ni cambios sobre sensores.

Una foto de perfil opcional se guarda como JPEG compacto en `photo_data`. La aplicacion acepta archivos de hasta 10 MB, redimensiona a 600 px como maximo y limita el resultado a 350000 caracteres. Esta decision mantiene atomicos el guardado y la eliminacion de ficha y foto. El original no se conserva. Base64 aumenta el tamaño aproximadamente un tercio; para galerias o fotos originales debera migrarse a Storage privado, con limpieza de archivos coordinada. No se utiliza un bucket publico.

La lista excluye fotos y pagina de 100 en 100. Solo se obtiene la foto seleccionada, evitando descargar todas las imagenes. El nombre, foto y datos se reflejan en sidebar, ficha y resumen existente. La pagina no presenta la mascota Max como si perteneciera a una cuenta real.

## Verificacion funcional

- Cuenta sin mascotas: abre creacion, permite cancelar y volver a abrir.
- Crear con foto, recargar y comprobar persistencia.
- Crear una segunda mascota y cambiar con Mis mascotas.
- Editar nombre y foto; editar solo texto conserva la foto anterior; Quitar fotografia la elimina al guardar.
- Error de red al guardar: conserva campos y permite reintentar. Si una creacion recibio respuesta incierta, Reintentar carga consulta el servidor antes de repetir; el ID de la solicitud evita duplicados dentro del mismo formulario.
- Eliminar: Cancelar conserva la mascota; confirmar elimina fila y foto. Eliminar la ultima abre nueva creacion.
- Otra cuenta: no puede ver ni modificar los datos anteriores, incluso consultando la API directamente (prueba SQL RLS).

Las lecturas y el mapa siguen siendo demostrativos y no se guardan en la base de datos. Si se crean tablas de registros en el futuro, sus claves foraneas y politicas deberan contemplar la eliminacion de la mascota. Actualmente todos los datos persistentes de la mascota estan en su fila.

Para Netlify manual: ejecutar `npm run build` y cargar `dist`. La migracion y los permisos residen en Supabase; no se vuelven a ejecutar por cada despliegue.
