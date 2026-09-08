# ByeTale · Registro técnico de bugs

Esta carpeta contiene el **espejo técnico automático** de los reportes enviados desde el cliente Godot.

## Flujo

1. El jugador escribe el problema dentro del juego.
2. Godot envía un payload técnico sanitizado a la Neon Function `bugreport`.
3. El servidor publica el reporte en el foro **Bugs** y conserva el `report_id` en SQL.
4. La función de solo lectura `buglogexport` expone únicamente reportes ya publicados y datos sanitizados.
5. GitHub Actions ejecuta `.github/workflows/bug-log-sync.yml` cada 5 minutos y genera un Markdown por reporte en esta carpeta.

El cliente **no contiene credenciales de GitHub**. GitHub Actions escribe usando su `GITHUB_TOKEN` efímero.

## Archivos

- `INDEX.md`: índice generado automáticamente, agrupado por fingerprint y con los reportes recientes.
- `<report_id>.md`: captura técnica de una incidencia concreta.

Cada reporte incluye, cuando existen:

- `report_id` y `thread_id`;
- enlace/correlación con el foro;
- fingerprint para agrupar incidencias equivalentes;
- mensaje escrito por el jugador;
- `error_code`;
- versión/build del cliente;
- plataforma;
- escena/mapa;
- stack trace o contexto técnico;
- metadata de runtime como FPS, renderer, locale, canal, modo de red y uptime;
- copia JSON sanitizada para análisis automático.

## Fingerprints

El fingerprint no sustituye al `report_id`. Sirve para agrupar ocurrencias probablemente relacionadas.

Se calcula a partir de información normalizada como:

- `error_code`;
- escena;
- primera línea del stack/contexto;
- para reportes manuales genéricos, una versión normalizada del mensaje.

UUID, números y direcciones hexadecimales se normalizan antes del hash para reducir falsos duplicados por valores variables.

## Privacidad

El espejo de GitHub es público, por lo que deliberadamente **no exporta**:

- `installation_id` ni su hash;
- tokens o secretos;
- correo;
- IP;
- chat;
- contraseñas;
- credenciales de sesión.

Los reportes son sanitizados antes de llegar a este registro.

## Fuente de verdad

- SQL/foro: fuente primaria del reporte.
- GitHub `community/docs/bug-reports`: histórico técnico y herramienta de análisis.

Los archivos generados llevan un comentario `AUTO-GENERATED`. No deben usarse para guardar notas manuales que se quieran conservar, porque el sincronizador puede regenerarlos.
