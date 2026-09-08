# API de reportes de bugs para Godot 4

El cliente Godot envía un reporte manual con diagnóstico técnico sanitizado. El servidor publica el reporte directamente en el foro **Bugs** y devuelve los identificadores de correlación. No existe ya una segunda confirmación web obligatoria.

## Endpoint de publicación

`POST https://br-lively-unit-aygkh67q-bugreport.compute.c-5.us-east-2.aws.neon.tech/`

Cabecera: `Content-Type: application/json`.

No hay claves de GitHub ni secretos del foro dentro del juego. Una credencial compilada en el cliente sería extraíble.

## Payload

```json
{
  "schema_version": 1,
  "installation_id": "6bb678ef-c19f-4b67-9a50-217bb91f2630",
  "error_code": "PLAYER_INVENTORY_DESYNC",
  "message": "El inventario local no coincide con el servidor",
  "game_version": "0.3.0-dev.42",
  "platform": "Linux",
  "scene": "res://maps/plaza.tscn",
  "stack_trace": "InventorySync.gd:184 <- Player.gd:92",
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

Límites principales:

- `error_code`: 64 caracteres.
- `message`: 1000 caracteres.
- `game_version`: 40 caracteres.
- `platform`: 80 caracteres.
- `scene`: 160 caracteres.
- `stack_trace`: 6000 caracteres.
- petición completa: 24 KiB.
- rate limit: 5 reportes por instalación cada 10 minutos.

El servidor elimina o evita patrones sensibles como correo, rutas locales y claves conocidas. No deben enviarse contraseñas, tokens, IP, chat ni nombres reales.

## Respuesta correcta

HTTP `201`:

```json
{
  "report_id": "uuid",
  "thread_id": "uuid",
  "published": true
}
```

El cliente solo debe considerar el reporte publicado cuando:

- `report_id` sea válido;
- `thread_id` sea válido;
- `published` sea `true`.

## Flujo servidor

La publicación se realiza en servidor y debe mantener correlación entre:

1. `game_bug_intake` — diagnóstico recibido.
2. `threads` — hilo visible del foro.
3. `posts` — primer mensaje del hilo.
4. `bug_reports` — metadata de bug.
5. `report_id` ↔ `thread_id` — relación de trazabilidad.

El usuario técnico del foro para publicaciones automáticas es `Reporte del juego`.

## Errores

- `400 invalid_request` — payload inválido.
- `413 payload_too_large` — reporte demasiado grande.
- `415 content_type_required` — formato incorrecto.
- `429 rate_limited` — esperar `retry_after_seconds`.
- `500 internal_error` — fallo del servicio; el cliente puede reintentar una sola vez.

## Espejo técnico en GitHub

Los reportes publicados se reflejan automáticamente en:

`community/docs/bug-reports/`

Componentes:

- Neon Function `buglogexport`: exportación de solo lectura y sanitizada.
- `.github/workflows/bug-log-sync.yml`: sincronización cada 5 minutos.
- `community/scripts/sync_bug_logs.py`: generador de Markdown e índice.
- `community/docs/bug-reports/INDEX.md`: agrupación por fingerprint.
- `community/docs/bug-reports/<report_id>.md`: registro técnico individual.

GitHub no es la fuente primaria. El foro/SQL conservan el reporte original; GitHub sirve como histórico técnico, correlación entre builds y análisis de recurrencia.

El cliente nunca recibe una credencial de GitHub. El workflow utiliza el `GITHUB_TOKEN` efímero de GitHub Actions.

## Datos del espejo

Cada archivo intenta conservar todos los datos técnicos sanitizados disponibles:

- `report_id`;
- `thread_id` y enlace del foro cuando la correlación existe;
- fingerprint de incidencia;
- mensaje del jugador;
- código de error;
- versión/build;
- plataforma;
- escena/mapa;
- stack trace/contexto técnico;
- metadata de runtime;
- timestamps;
- representación JSON sanitizada para análisis automático.

No se exportan `installation_id`, hashes de instalación, credenciales, correo, IP, chat ni tokens.

## Reportes manuales

El menú del juego debe mostrar al jugador qué diagnóstico se enviará y solicitar consentimiento antes del POST.

Los cierres abruptos/crash dumps requieren un flujo separado; no deben convertirse en reportes automáticos en bucle sin consentimiento y controles adicionales.
