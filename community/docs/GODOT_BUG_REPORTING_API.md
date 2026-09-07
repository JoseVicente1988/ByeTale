# API de reportes de bugs para Godot 4

El juego envía un diagnóstico privado, recibe una URL temporal y la abre para que el jugador añada una nota y una captura. Solo al confirmar se crea el hilo en **Bugs**. Los informes sin confirmar caducan en 24 horas.

## Endpoint

`POST https://br-lively-unit-aygkh67q-bugreport.compute.c-5.us-east-2.aws.neon.tech/`

Cabecera: `Content-Type: application/json`. No hay clave secreta dentro del juego: una clave compilada sería extraíble. El límite es 5 informes por instalación cada 10 minutos y 24 KiB por petición.

```json
{
  "schema_version": 1,
  "installation_id": "6bb678ef-c19f-4b67-9a50-217bb91f2630",
  "error_code": "PLAYER_INVENTORY_DESYNC",
  "message": "El inventario local no coincide con el servidor",
  "game_version": "0.3.0-dev.42",
  "platform": "Linux",
  "scene": "res://world/godspire_citadel.tscn",
  "stack_trace": "InventorySync.gd:184 <- Player.gd:92",
  "metadata": {"renderer":"gl_compatibility","locale":"es_ES","build_channel":"testing","network_mode":"client","uptime_seconds":1420,"fps":59.8}
}
```

Límites: `error_code` 64 caracteres (`A-Z`, `a-z`, números, `. _ : -`), `message` 1000, `game_version` 40, `platform` 80, `scene` 160 y `stack_trace` 6000. Solo se conservan las claves de `metadata` mostradas arriba. No envíes contraseñas, claves, chats, IP, nombres reales ni archivos. La API elimina patrones de correo, rutas locales y claves conocidas.

Respuesta `201`:

```json
{"report_id":"uuid","report_token":"token-temporal","report_url":"https://byetale-community.vercel.app/forum/reportar?report=uuid#token=token-temporal","expires_at":"fecha ISO"}
```

No registres `report_token`. Viaja en el fragmento `#`, que no se manda en el `Referer`.

Errores: `400 invalid_request`, `413 payload_too_large`, `415 content_type_required`, `429 rate_limited` (esperar `retry_after_seconds`) y `500 internal_error` (ofrecer reporte manual y reintentar como máximo una vez).

## Cliente listo para copiar

Guárdalo como `bug_reporter.gd` y añádelo como autoload `BugReporter`.

```gdscript
extends Node

const API_URL := "https://br-lively-unit-aygkh67q-bugreport.compute.c-5.us-east-2.aws.neon.tech/"
const ID_FILE := "user://bug_report_installation_id.txt"
var request_node: HTTPRequest

func _ready() -> void:
    request_node = HTTPRequest.new()
    request_node.timeout = 12.0
    add_child(request_node)
    request_node.request_completed.connect(_completed)

func report_bug(code: String, message: String, scene := "", trace := "") -> void:
    if request_node.get_http_client_status() != HTTPClient.STATUS_DISCONNECTED:
        return
    var payload := {
        "schema_version": 1,
        "installation_id": _installation_id(),
        "error_code": code.left(64),
        "message": message.left(1000),
        "game_version": ProjectSettings.get_setting("application/config/version", "dev"),
        "platform": OS.get_name(),
        "scene": scene.left(160),
        "stack_trace": trace.left(6000),
        "metadata": {
            "renderer": RenderingServer.get_video_adapter_name().left(120),
            "locale": TranslationServer.get_locale().left(120),
            "build_channel": "testing",
            "uptime_seconds": int(Time.get_ticks_msec() / 1000.0)
        }
    }
    request_node.request(API_URL, PackedStringArray(["Content-Type: application/json"]), HTTPClient.METHOD_POST, JSON.stringify(payload))

func _completed(result: int, status: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
    var data = JSON.parse_string(body.get_string_from_utf8())
    if result == HTTPRequest.RESULT_SUCCESS and status == 201 and data is Dictionary:
        OS.shell_open(str(data.report_url))
    else:
        OS.shell_open("https://byetale-community.vercel.app/forum/reportar")

func _installation_id() -> String:
    if FileAccess.file_exists(ID_FILE):
        var saved := FileAccess.get_file_as_string(ID_FILE).strip_edges()
        if saved.is_valid_uuid(): return saved
    var bytes := Crypto.new().generate_random_bytes(16)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    var value := bytes.hex_encode()
    value = "%s-%s-%s-%s-%s" % [value.substr(0,8),value.substr(8,4),value.substr(12,4),value.substr(16,4),value.substr(20,12)]
    var file := FileAccess.open(ID_FILE, FileAccess.WRITE)
    if file: file.store_string(value)
    return value
```

Botón manual:

```gdscript
func _on_report_bug_pressed() -> void:
    BugReporter.report_bug("PLAYER_MANUAL_REPORT", "Reporte abierto manualmente", get_tree().current_scene.scene_file_path)
```

Antes de enviarlo, muestra consentimiento y los datos incluidos. Evita reportes automáticos en bucle; los cierres abruptos requieren otro sistema de crash dumps y consentimiento explícito.
