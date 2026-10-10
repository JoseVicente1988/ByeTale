# ByeTale Community — subida de multimedia y ZIP

## Multimedia lista para activar

El foro usa el flujo autenticado de `forumupload` y conserva compatibilidad con `image_url`.

- Imágenes: PNG, JPG/JPEG y WEBP — máximo 3 MB.
- Vídeo: MP4 y WEBM — máximo 25 MB.
- Audio: MP3, OGG, WAV y M4A — máximo 12 MB.
- Vídeo y audio se guardan como `media_url`, `media_kind` y `media_mime` y se reproducen inline en el foro.
- La función de upload valida firma de archivo además del MIME declarado y genera nombres UUID en storage.

La migración `0006_forum_media_attachments.sql` debe estar aplicada en Neon antes de publicar el frontend que consulta esos campos.

## ZIP — preparado, todavía desactivado

ZIP se incorporará como `media_kind = 'archive'` y `media_mime = 'application/zip'`.

Reglas previstas:

- validación por firma ZIP antes de almacenar;
- límite duro de tamaño antes de leer/procesar el cuerpo completo;
- nombre aleatorio UUID, sin reutilizar el nombre proporcionado por el usuario;
- no extraer el ZIP en servidor;
- no ejecutar ni inspeccionar contenido interno durante la publicación;
- mostrarlo en el foro como archivo descargable, nunca inline;
- mantener autenticación y CORS del uploader actual.

El archivo `db/migrations/0007_forum_archive_attachments.DRAFT.sql` contiene el cambio de esquema preparado, pero no debe aplicarse hasta habilitar también la validación ZIP en `forumupload`.
