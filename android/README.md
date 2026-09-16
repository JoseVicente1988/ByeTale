# ByeTale Android update channel

El juego consulta `android/latest.json` antes del login.

## Publicar una actualización

1. Exporta el APK con el mismo application ID y la misma firma que la versión instalada.
2. Incrementa siempre `version/code` del preset Android.
3. Sube el APK como asset de una GitHub Release (recomendado frente a guardar APKs grandes directamente en el repositorio).
4. Calcula SHA-256 del APK.
5. Actualiza `android/latest.json`:
   - `version`: nombre visible de la build.
   - `version_code`: entero mayor que el de la build anterior.
   - `apk_url`: URL directa del asset APK de la Release.
   - `sha256`: hash SHA-256 en hexadecimal.
   - `required`: `true` para impedir continuar con una build obsoleta, `false` para permitir omitir.

La app descarga el APK en `user://updates`, verifica SHA-256 y abre el instalador Android usando un FileProvider privado. Android exige confirmación del usuario y puede pedir permiso para instalar apps de esta fuente.

## Google Play

Para una publicación en Google Play, usa Play In-App Updates en lugar de `REQUEST_INSTALL_PACKAGES`. El updater propio está pensado para builds beta/sideload.
