# API de reportes de bugs para Godot 4

ByeTale utiliza el mismo canal de publicación para reportes manuales, errores automáticos y crashes recuperados en el siguiente arranque. El servidor publica directamente en el foro **Bugs** y GitHub mantiene un espejo técnico automático.

## Endpoint de publicación

`POST https://br-lively-unit-aygkh67q-bugreport.compute.c-5.us-east-2.aws.neon.tech/`

Cabecera: `Content-Type: application/json`.

No hay claves de GitHub ni secretos del foro dentro del cliente.

## Payload de transporte

El contrato HTTP continúa siendo compatible con schema 1:

```json
{
  "schema_version": 1,
  "installation_id": "uuid-local",
  "error_code": "AUTO_SCRIPT_ERROR",
  "message": "SCRIPT ERROR: ...",
  "game_version": "v35.0.8-auto-crash-correlation",
  "platform": "Linux",
  "scene": "res://maps/plaza.tscn",
  "stack_trace": "[BYETALE_INCIDENT_V2] ...",
  "metadata": {
    "renderer": "gl_compatibility",
    "locale": "es_ES",
    "build_channel": "testing",
    "network_mode": "client",
    "uptime_seconds": 1420,
    "fps": 59.8
  }
}
```

La correlación avanzada viaja dentro del campo técnico `stack_trace` para mantener compatibilidad con el servidor actual.

### Sección `BYETALE_INCIDENT_V2`

```text
[BYETALE_INCIDENT_V2]
incident_id=<uuid>
session_id=<uuid>
report_kind=automatic_script_error|automatic_runtime|automatic_crash|manual
account_id=<id técnico de cuenta>
username=<usuario del juego>
character_id=<id técnico del personaje>
character_name=<nombre del personaje>
```

### Sección `ERROR_TRACE`

Contiene el stack/backtrace/log recuperado cuando existe.

### Sección `BYETALE_RUNTIME_CONTEXT_V2`

Incluye, según disponibilidad:

- timestamp UTC;
- escena/mapa;
- posición del personaje;
- display server;
- tamaño de ventana y pantalla;
- modo de ventana y VSync;
- sistema operativo y versión;
- arquitectura;
- CPU y número de hilos;
- RAM estática actual/pico;
- GPU, fabricante y API;
- renderer;
- versión de Godot;
- locale;
- FPS;
- uptime;
- modo de red.

## IDs

- `report_id`: un envío concreto, generado en SQL.
- `thread_id`: hilo creado en el foro para ese envío.
- `incident_id`: problema real correlacionable. Un automático y un manual posterior pueden compartirlo.
- `session_id`: ejecución concreta del cliente.
- `account_id` / `character_id`: permiten localizar el usuario/personaje involucrado sin enviar tokens ni correo.

El reporte manual reutiliza el último `incident_id` automático durante una ventana de 15 minutos. Al publicarse correctamente el manual, esa correlación activa se cierra.

## Respuesta correcta

HTTP `201`:

```json
{
  "report_id": "uuid",
  "thread_id": "uuid",
  "published": true
}
```

## Errores automáticos durante ejecución

`BugReporter.report_runtime_error(code, message, trace)`:

1. conserva el `push_error()` local;
2. captura backtraces de script cuando están disponibles;
3. genera `incident_id`;
4. adjunta identidad técnica + contexto runtime;
5. encola el reporte automático.

Además, `BugReporter` vigila `user://logs/byetale.log` y detecta nuevas líneas `SCRIPT ERROR:`/`FATAL:`. Hay deduplicación y un máximo local de 3 automáticos por 10 minutos.

## Crash duro

Un proceso muerto no puede hacer HTTP. Por eso:

1. cada ejecución escribe `user://bug_runtime_session.json` con `clean_exit=false`;
2. `_exit_tree()` marca `clean_exit=true` en cierres normales;
3. Godot mantiene file logging en `user://logs/byetale.log`;
4. si el siguiente arranque encuentra una sesión no limpia, lee el log rotado anterior;
5. publica `AUTO_CRASH_PREVIOUS_SESSION` cuando encuentra marcador de crash/fatal, o `AUTO_UNCLEAN_EXIT` fuera del editor;
6. conserva el crash en `user://bug_pending_crash.json` hasta recibir HTTP 201;
7. mantiene su `incident_id` para correlacionarlo con un manual posterior.

En builds release está activo `debug/settings/gdscript/always_track_call_stacks` para que los errores GDScript tengan stacks accionables.

## GitHub

Los reportes publicados se sincronizan automáticamente a:

`community/docs/bug-reports/`

Componentes:

- Neon Function `buglogexport`;
- `.github/workflows/bug-log-sync.yml` cada 5 minutos;
- `community/scripts/sync_bug_logs.py`;
- `INDEX.md`, agrupado por `incident_id` y fingerprint;
- `<report_id>.md`, expediente individual.

GitHub Actions utiliza `GITHUB_TOKEN`; el juego no contiene ninguna credencial de GitHub.

## Privacidad

Para la correlación solicitada se incluyen identidad **del juego** (`account_id`, username, `character_id`, nombre del personaje). No se envían:

- access/session tokens;
- contraseña;
- correo;
- IP;
- chat;
- identificadores físicos únicos del hardware;
- rutas locales del sistema.

El reporte manual muestra estos datos antes de pedir consentimiento. Los reportes automáticos se limitan al contexto técnico y a la identidad del juego necesaria para correlación.
