from __future__ import annotations

import datetime as dt
import hashlib
import html
import json
import os
import pathlib
import re
import urllib.request

EXPORT_URL = os.environ.get(
    "BUG_EXPORT_URL",
    "https://br-lively-unit-aygkh67q-buglogexport.compute.c-5.us-east-2.aws.neon.tech/",
)
BASE = pathlib.Path("community/docs/bug-reports")

UUID_RE = re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.I)
HEX_RE = re.compile(r"\b0x[0-9a-f]+\b", re.I)
NUM_RE = re.compile(r"\b\d+\b")


def text(value: object) -> str:
    return "" if value is None else str(value)


def esc(value: object) -> str:
    return html.escape(text(value), quote=False)


def normalize(value: object) -> str:
    result = text(value).lower().strip()
    result = UUID_RE.sub("<uuid>", result)
    result = HEX_RE.sub("<hex>", result)
    result = NUM_RE.sub("<n>", result)
    result = re.sub(r"\s+", " ", result)
    return result[:500]


def parse_section(trace: str, section_name: str) -> dict[str, str]:
    wanted = f"[{section_name}]"
    active = False
    result: dict[str, str] = {}
    for raw_line in trace.splitlines():
        line = raw_line.strip()
        if line == wanted:
            active = True
            continue
        if active and line.startswith("[") and line.endswith("]"):
            break
        if not active or "=" not in line:
            continue
        key, value = line.split("=", 1)
        result[key.strip()] = value.strip()
    return result


def first_error_trace_line(trace: str) -> str:
    active = False
    for raw_line in trace.splitlines():
        line = raw_line.strip()
        if line == "[ERROR_TRACE]":
            active = True
            continue
        if active and line.startswith("[") and line.endswith("]"):
            break
        if active and line:
            return line
    return ""


def enrich_report(report: dict[str, object]) -> None:
    trace = text(report.get("stack_trace"))
    incident = parse_section(trace, "BYETALE_INCIDENT_V2")
    runtime = parse_section(trace, "BYETALE_RUNTIME_CONTEXT_V2")
    report["incident"] = incident
    report["runtime_context"] = runtime


def fingerprint(report: dict[str, object]) -> str:
    trace = text(report.get("stack_trace"))
    first_trace = first_error_trace_line(trace)
    if not first_trace:
        runtime = report.get("runtime_context") if isinstance(report.get("runtime_context"), dict) else {}
        first_trace = text(runtime.get("map_id"))
    parts = [
        normalize(report.get("error_code")),
        normalize(report.get("scene")),
        normalize(first_trace),
    ]
    if text(report.get("error_code")) == "PLAYER_MANUAL_REPORT":
        parts.append(normalize(report.get("message")))
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()[:16]


def code_block(value: object) -> str:
    lines = text(value).splitlines() or [""]
    return "\n".join("    " + line for line in lines)


def fetch_reports() -> list[dict[str, object]]:
    request = urllib.request.Request(
        EXPORT_URL + "?limit=500",
        headers={"User-Agent": "ByeTale-GitHub-Bug-Sync/2.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)
    if not payload.get("ok"):
        raise RuntimeError(f"bug export failed: {payload}")
    reports = payload.get("reports") or []
    if not isinstance(reports, list):
        raise RuntimeError("bug export returned an invalid reports array")
    return [item for item in reports if isinstance(item, dict)]


def render_report(report: dict[str, object]) -> str:
    report_id = text(report.get("report_id")).strip()
    fp = text(report["fingerprint"])
    metadata = report.get("metadata") if isinstance(report.get("metadata"), dict) else {}
    incident = report.get("incident") if isinstance(report.get("incident"), dict) else {}
    runtime = report.get("runtime_context") if isinstance(report.get("runtime_context"), dict) else {}
    thread_id = text(report.get("thread_id")) or "sin-correlacion"
    forum_url = text(report.get("forum_url"))
    thread_slug = text(report.get("thread_slug"))
    forum_line = (
        f"[{esc(thread_slug or thread_id)}]({forum_url})"
        if forum_url
        else "_sin URL correlacionada_"
    )
    stack = text(report.get("stack_trace")).strip() or (
        "(sin stack trace/contexto técnico adicional en esta captura)"
    )
    metadata_rows = "\n".join(
        f"| `{esc(key)}` | `{esc(value)}` |"
        for key, value in sorted(metadata.items())
    ) or "| _sin metadata adicional_ | — |"
    runtime_rows = "\n".join(
        f"| `{esc(key)}` | `{esc(value)}` |"
        for key, value in sorted(runtime.items())
    ) or "| _sin contexto V2_ | — |"

    raw_record = {
        "report_id": report_id,
        "thread_id": report.get("thread_id"),
        "thread_slug": report.get("thread_slug"),
        "fingerprint": fp,
        "incident": incident,
        "runtime_context": runtime,
        "error_code": report.get("error_code"),
        "message": report.get("message"),
        "game_version": report.get("game_version"),
        "platform": report.get("platform"),
        "scene": report.get("scene"),
        "stack_trace": report.get("stack_trace"),
        "metadata": metadata,
        "created_at": report.get("created_at"),
        "published_at": report.get("published_at"),
    }

    return f"""<!-- AUTO-GENERATED by .github/workflows/bug-log-sync.yml. Do not store secrets here. -->
# Bug report `{report_id}`

> Registro técnico generado automáticamente a partir de un reporte sanitizado por el sistema de ByeTale.

## Correlación

| Campo | Valor |
| --- | --- |
| Report ID | `{esc(report_id)}` |
| Incident ID | `{esc(incident.get('incident_id') or 'legacy/sin incident_id')}` |
| Session ID | `{esc(incident.get('session_id') or 'legacy/sin session_id')}` |
| Tipo de reporte | `{esc(incident.get('report_kind') or 'legacy')}` |
| Thread ID | `{esc(thread_id)}` |
| Hilo del foro | {forum_line} |
| Fingerprint | `{fp}` |
| Recibido | `{esc(report.get('created_at') or 'desconocido')}` |
| Publicado | `{esc(report.get('published_at') or 'desconocido')}` |

## Usuario / personaje

| Campo | Valor |
| --- | --- |
| Account ID | `{esc(incident.get('account_id') or 'no disponible')}` |
| Usuario | `{esc(incident.get('username') or 'no disponible')}` |
| Character ID | `{esc(incident.get('character_id') or 'no disponible')}` |
| Personaje | `{esc(incident.get('character_name') or 'no disponible')}` |

## Problema indicado por el cliente/jugador

{esc(report.get('message')) or '_sin descripción_'}

## Contexto del cliente

| Campo | Valor |
| --- | --- |
| Error code | `{esc(report.get('error_code'))}` |
| Versión | `{esc(report.get('game_version'))}` |
| Plataforma | `{esc(report.get('platform'))}` |
| Escena / mapa | `{esc(report.get('scene'))}` |

## Contexto runtime estructurado

| Clave | Valor |
| --- | --- |
{runtime_rows}

## Stack trace / log técnico completo

{code_block(stack)}

## Metadata de la API

| Clave | Valor |
| --- | --- |
{metadata_rows}

## Registro sanitizado para análisis

```json
{json.dumps(raw_record, ensure_ascii=False, indent=2, sort_keys=True)}
```

## Privacidad

Este espejo puede contener el **usuario/personaje del juego y sus IDs técnicos** para correlacionar incidencias. No contiene `installation_id`, hashes de instalación, access tokens, contraseña, correo, IP, chat ni credenciales.
"""


def write_index(reports: list[dict[str, object]]) -> None:
    fingerprint_groups: dict[str, list[dict[str, object]]] = {}
    incident_groups: dict[str, list[dict[str, object]]] = {}
    for report in reports:
        fingerprint_groups.setdefault(text(report["fingerprint"]), []).append(report)
        incident = report.get("incident") if isinstance(report.get("incident"), dict) else {}
        incident_id = text(incident.get("incident_id"))
        if incident_id:
            incident_groups.setdefault(incident_id, []).append(report)

    def sort_key(report: dict[str, object]) -> str:
        return text(report.get("created_at"))

    fp_rows: list[tuple[str, str, int, str, str, str, str]] = []
    for fp, items in fingerprint_groups.items():
        items.sort(key=sort_key)
        latest = items[-1]
        versions = sorted(
            {text(item.get("game_version")) for item in items if text(item.get("game_version"))}
        )
        fp_rows.append(
            (
                text(latest.get("created_at")),
                fp,
                len(items),
                text(latest.get("error_code")),
                text(latest.get("scene")),
                ", ".join(versions[-5:]),
                text(latest.get("report_id")),
            )
        )
    fp_rows.sort(reverse=True)

    incident_rows: list[tuple[str, str, int, str, str, str, str, str]] = []
    for incident_id, items in incident_groups.items():
        items.sort(key=sort_key)
        latest = items[-1]
        latest_incident = latest.get("incident") if isinstance(latest.get("incident"), dict) else {}
        kinds = sorted({
            text((item.get("incident") if isinstance(item.get("incident"), dict) else {}).get("report_kind"))
            for item in items
            if text((item.get("incident") if isinstance(item.get("incident"), dict) else {}).get("report_kind"))
        })
        versions = sorted({text(item.get("game_version")) for item in items if text(item.get("game_version"))})
        incident_rows.append((
            text(latest.get("created_at")),
            incident_id,
            len(items),
            text(latest_incident.get("username")),
            text(latest_incident.get("character_name")),
            ", ".join(kinds),
            ", ".join(versions[-5:]),
            text(latest.get("report_id")),
        ))
    incident_rows.sort(reverse=True)

    now = dt.datetime.now(dt.timezone.utc).isoformat()
    lines = [
        "# ByeTale · Bug report index",
        "",
        f"_Sincronizado automáticamente: `{now}` · {len(reports)} reportes · "
        f"{len(incident_groups)} incidentes correlacionados · {len(fingerprint_groups)} fingerprints._",
        "",
        "## Incidentes correlacionados",
        "",
        "Un `incident_id` agrupa el evento automático (error/crash) y el reporte manual posterior cuando pertenecen al mismo caso.",
        "",
        "| Incident ID | Eventos | Usuario | Personaje | Tipos | Versiones | Último reporte |",
        "| --- | ---: | --- | --- | --- | --- | --- |",
    ]
    for _created, incident_id, count, username, character, kinds, versions, report_id in incident_rows:
        lines.append(
            f"| `{esc(incident_id)}` | {count} | {esc(username) or '—'} | {esc(character) or '—'} | "
            f"{esc(kinds)} | {esc(versions)} | [{report_id}]({report_id}.md) |"
        )

    lines.extend([
        "",
        "## Grupos por fingerprint",
        "",
        "| Fingerprint | Ocurrencias | Error | Escena | Versiones recientes | Último reporte |",
        "| --- | ---: | --- | --- | --- | --- |",
    ])
    for _created, fp, count, code, scene, versions, report_id in fp_rows:
        lines.append(
            f"| `{fp}` | {count} | `{esc(code)}` | `{esc(scene)}` | "
            f"{esc(versions)} | [{report_id}]({report_id}.md) |"
        )

    lines.extend(["", "## Reportes recientes", ""])
    for report in sorted(reports, key=sort_key, reverse=True)[:100]:
        report_id = text(report.get("report_id"))
        incident = report.get("incident") if isinstance(report.get("incident"), dict) else {}
        incident_id = text(incident.get("incident_id"))
        kind = text(incident.get("report_kind")) or "legacy"
        lines.append(
            f"- [{report_id}]({report_id}.md) · `{esc(kind)}` · incident `{esc(incident_id) or '—'}` · "
            f"`{esc(report.get('game_version'))}` · `{esc(report.get('error_code'))}` · {esc(report.get('scene'))}"
        )

    (BASE / "INDEX.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    BASE.mkdir(parents=True, exist_ok=True)
    reports = fetch_reports()
    indexed: list[dict[str, object]] = []

    for report in reports:
        report_id = text(report.get("report_id")).strip()
        if not report_id:
            continue
        enrich_report(report)
        report["fingerprint"] = fingerprint(report)
        indexed.append(report)
        (BASE / f"{report_id}.md").write_text(render_report(report), encoding="utf-8")

    write_index(indexed)
    print(f"Exported {len(indexed)} published reports into {BASE}")


if __name__ == "__main__":
    main()
