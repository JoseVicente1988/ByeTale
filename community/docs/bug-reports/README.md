# ByeTale · Registro técnico de bugs

Esta carpeta contiene el **espejo técnico automático** de incidencias enviadas desde el cliente Godot: reportes manuales, errores detectados durante ejecución y crashes recuperados al siguiente arranque.

## Flujo

1. Godot genera o detecta una incidencia.
2. Se asigna un `incident_id` y un `session_id`.
3. El cliente adjunta usuario/personaje del juego mediante IDs técnicos y contexto de ejecución.
4. La Neon Function `bugreport` publica el reporte en **Bugs** y conserva el `report_id` en SQL.
5. `buglogexport` expone los reportes publicados y sanitizados.
6. GitHub Actions ejecuta `.github/workflows/bug-log-sync.yml` cada 5 minutos y genera un Markdown por reporte.

El cliente **no contiene credenciales de GitHub**. GitHub Actions escribe usando su `GITHUB_TOKEN` efímero.

## Correlación de un mismo incidente

`report_id` identifica un envío individual.

`incident_id` identifica el **problema real**. Si el juego detecta primero un error/crash automático y el jugador abre después `Reportar bug`, el reporte manual reutiliza el mismo `incident_id` durante la ventana de correlación. De esta forma GitHub puede mostrar ambos eventos juntos.

Ejemplo:

```text
incident_id = 9c8...42a
  ├─ AUTO_SCRIPT_ERROR        report_id=A
  └─ PLAYER_MANUAL_REPORT     report_id=B
```

`session_id` identifica la ejecución concreta del cliente donde ocurrió el evento.

## Crash duro

Un proceso que ya ha muerto no puede ejecutar una petición HTTP. ByeTale mantiene un marcador de sesión y Godot escribe el crash/backtrace en `user://logs/byetale.log`.

Si al siguiente arranque la sesión anterior no figura como cerrada limpiamente:

- se recupera el log rotado anterior;
- se mantiene el `incident_id` preasignado a esa sesión;
- se publica automáticamente `AUTO_CRASH_PREVIOUS_SESSION` o `AUTO_UNCLEAN_EXIT`;
- el crash queda pendiente localmente hasta que el servidor confirme `201`;
- un reporte manual posterior puede reutilizar ese mismo `incident_id`.

## Errores durante ejecución

- Los `push_error()` relevantes del proyecto pasan por `BugReporter.report_runtime_error()`.
- Los `SCRIPT ERROR:`/`FATAL:` que aparecen en el log de Godot se detectan automáticamente.
- Hay deduplicación local.
- Máximo local de 3 envíos automáticos por 10 minutos, además del límite del servidor.

## Archivos

- `INDEX.md`: índice generado automáticamente con agrupación por `incident_id` y por fingerprint.
- `<report_id>.md`: expediente técnico de un envío concreto.

Cada expediente puede contener:

- `report_id`, `thread_id`, `incident_id`, `session_id`;
- tipo: manual, automatic_runtime, automatic_script_error o automatic_crash;
- `account_id`, username, `character_id`, nombre del personaje;
- fingerprint;
- mensaje/código de error;
- versión/build;
- plataforma;
- escena/mapa y posición del personaje;
- stack trace / crash log;
- Godot, CPU/arquitectura, GPU/API, renderer;
- RAM del proceso;
- resolución, modo de ventana, VSync y display server;
- FPS, uptime, locale y contexto de red;
- copia JSON sanitizada para análisis.

## Fingerprints

El fingerprint agrupa ocurrencias técnicamente similares aunque tengan distintos `incident_id` o usuarios. Se basa en código, escena y primera línea útil del error/trace normalizada. UUID, números y direcciones hexadecimales se normalizan para reducir falsos negativos.

## Privacidad

El espejo de GitHub es público. Para permitir el rastreo solicitado contiene **identidad del juego**, no identidad personal externa:

- `account_id`;
- username del juego;
- `character_id`;
- nombre del personaje.

No exporta:

- `installation_id` ni su hash;
- access/session tokens;
- contraseña;
- correo;
- IP;
- chat;
- rutas locales del sistema;
- identificadores físicos únicos del hardware.

## Fuente de verdad

- SQL/foro: fuente primaria.
- GitHub `community/docs/bug-reports`: histórico técnico, correlación, análisis entre builds y rastreo de errores.

Los archivos generados llevan un comentario `AUTO-GENERATED` y pueden ser regenerados por el sincronizador.
