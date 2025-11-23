extends Node
class_name AES_Manager
# AES-CBC + PKCS7
# - KEY/IV fijas por export o persistidas
# - (Opcional) IV aleatoria por mensaje (prefijada)
# - decrypt_base64() ahora autodetecta: IV fija / IV prefijada / IV sufijada

var AES_KEY: PackedByteArray = PackedByteArray() # 16/24/32 bytes
var AES_IV: PackedByteArray = PackedByteArray()  # 16 bytes

@export var auto_generate_on_ready: bool = true
@export var desired_key_len: int = 32 # 16, 24 o 32

@export var use_exported_key_iv: bool = false
@export var exported_key_b64: String = ""   # base64 KEY (16/24/32 bytes)
@export var exported_iv_b64: String = ""    # base64 IV (16 bytes)

@export var persist_keys: bool = false
@export var persist_path: String = "user://aes_kv.bin" # MAGIC | keylen(1) | KEY | IV(16)

@export var debug_logs: bool = false
@export var auto_format_detection: bool = true # <- NUEVO: autodetección en decrypt_base64()

const _MAGIC := "AES1"

func _ready() -> void:
	if  multiplayer.is_server():
		if auto_generate_on_ready:
			_init_key_iv()

# =========================
# Inicialización / Persistencia
# =========================
func _init_key_iv() -> void:
	# A) KEY/IV exportadas
	if use_exported_key_iv and exported_key_b64 != "" and exported_iv_b64 != "":
		set_key_iv_base64(exported_key_b64, exported_iv_b64)
		if _key_iv_ok():
			return

	# B) Cargar de disco
	if persist_keys:
		var loaded = _load_key_iv_from_disk()
		if loaded:
			return

	# C) Generar si no hay válidas
	var klen = desired_key_len
	if not (klen == 16 or klen == 24 or klen == 32):
		klen = 32
	if not (AES_KEY.size() == 16 or AES_KEY.size() == 24 or AES_KEY.size() == 32):
		AES_KEY = Crypto.new().generate_random_bytes(klen)
	if AES_IV.size() != 16:
		AES_IV = Crypto.new().generate_random_bytes(16)

	if persist_keys and _key_iv_ok():
		_save_key_iv_to_disk()

func _save_key_iv_to_disk() -> void:
	if not _key_iv_ok():
		return
	var f = FileAccess.open(persist_path, FileAccess.WRITE)
	if f == null:
		return
	f.store_buffer(_MAGIC.to_utf8_buffer())
	f.store_8(AES_KEY.size())
	f.store_buffer(AES_KEY)
	f.store_buffer(AES_IV)
	f.flush()
	f.close()

func _load_key_iv_from_disk() -> bool:
	if not FileAccess.file_exists(persist_path):
		return false
	var f = FileAccess.open(persist_path, FileAccess.READ)
	
	if f == null:
		print("No hay datos en AES file")
		return false
	var total = f.get_length()
	if total < 4 + 1 + 16:
		f.close(); return false

	var magic = f.get_buffer(4).get_string_from_utf8()
	if magic != _MAGIC:
		f.close(); return false
		#print("[AES] "+str(magic))
	var klen = f.get_8()
	if not (klen == 16 or klen == 24 or klen == 32):
		f.close(); return false

	if total < 4 + 1 + klen + 16:
		f.close(); return false

	var key = f.get_buffer(klen)
	var iv  = f.get_buffer(16)
	f.close()

	AES_KEY = key
	AES_IV  = iv
	return _key_iv_ok()

# =========================
# Setters/Getters KEY/IV
# =========================
func set_key_iv(key, iv) -> void:
	# ATENCIÓN: si pasas String aquí, se toma como bytes UTF-8 literales.
	if typeof(key) == TYPE_STRING:
		AES_KEY = (key as String).to_utf8_buffer()
	elif typeof(key) == TYPE_PACKED_BYTE_ARRAY:
		AES_KEY = (key as PackedByteArray).duplicate()

	if typeof(iv) == TYPE_STRING:
		AES_IV = (iv as String).to_utf8_buffer()
	elif typeof(iv) == TYPE_PACKED_BYTE_ARRAY:
		AES_IV = (iv as PackedByteArray).duplicate()

	if persist_keys and _key_iv_ok():
		_save_key_iv_to_disk()

func set_key_iv_base64(key_b64: String, iv_b64: String) -> void:
	AES_KEY = Marshalls.base64_to_raw(key_b64)
	AES_IV  = Marshalls.base64_to_raw(iv_b64)
	if persist_keys and _key_iv_ok():
		_save_key_iv_to_disk()

func set_key_iv_hex(key_hex: String, iv_hex: String) -> void:
	AES_KEY = _hex_to_pba(key_hex)
	AES_IV  = _hex_to_pba(iv_hex)
	if persist_keys and _key_iv_ok():
		_save_key_iv_to_disk()

func get_key_base64() -> String:
	return Marshalls.raw_to_base64(AES_KEY)

func get_iv_base64() -> String:
	return Marshalls.raw_to_base64(AES_IV)

# =========================
# Cifrado / Descifrado (IV fija)
# =========================
func aes_encrypt(text: String) -> PackedByteArray:
	if not _key_iv_ok():
		return PackedByteArray()

	var data: PackedByteArray = text.to_utf8_buffer()

	# PKCS7 padding
	var pad = 16 - (data.size() % 16)
	var i = 0
	while i < pad:
		data.append(pad)
		i += 1

	var aes = AESContext.new()
	var rc = aes.start(AESContext.MODE_CBC_ENCRYPT, AES_KEY, AES_IV)
	if rc != OK:
		push_error("AES: start ENCRYPT rc=%d" % rc)
		return PackedByteArray()

	var enc = aes.update(data)
	aes.finish() # void
	return enc

func aes_decrypt(data: PackedByteArray) -> String:
	if not _key_iv_ok():
		return ""
	if data.is_empty():
		push_error("AES: ciphertext vacío.")
		return ""
	if data.size() % 16 != 0:
		push_error("AES: ciphertext no es múltiplo de 16 (%d)." % data.size())
		return ""

	var aes = AESContext.new()
	var rc = aes.start(AESContext.MODE_CBC_DECRYPT, AES_KEY, AES_IV)
	if rc != OK:
		push_error("AES: start DECRYPT rc=%d" % rc)
		return ""

	var dec = aes.update(data)
	aes.finish() # void

	if dec.is_empty():
		push_error("AES: decrypt vacío (KEY/IV incorrectas o datos corruptos).")
		return ""

	# PKCS7 estricto
	var pad = int(dec[dec.size() - 1])
	if pad <= 0 or pad > 16 or pad > dec.size():
		push_error("AES: padding PKCS7 inválido (%d)." % pad)
		return ""
	var i = 0
	while i < pad:
		if int(dec[dec.size() - 1 - i]) != pad:
			push_error("AES: padding inconsistente (probable KEY/IV incorrectas).")
			return ""
		i += 1

	dec = dec.slice(0, dec.size() - pad)
	return dec.get_string_from_utf8()

func encrypt_base64(text: String) -> String:
	var enc = aes_encrypt(text)
	if enc.is_empty():
		return ""
	return Marshalls.raw_to_base64(enc)

# =========================
# Decrypt base64 con autodetección (por defecto)
# =========================
func decrypt_base64(b64: String) -> String:
	var raw = _b64_to_raw(b64)
	if raw.is_empty():
		return ""
	if not auto_format_detection:
		return aes_decrypt(raw)

	# 1) Intento IV fija
	if raw.size() % 16 == 0:
		var t1 = aes_decrypt(raw)
		if t1 != "":
			if debug_logs:
				print("[AES] base64: IV fija OK")
			return t1

	# 2) Intento IV prefijada (primeros 16 bytes)
	if raw.size() >= 32 and (raw.size() - 16) % 16 == 0:
		var t2 = decrypt_with_prefixed_iv(raw)
		if t2 != "":
			if debug_logs:
				print("[AES] base64: IV prefijada OK")
			return t2

	# 3) Intento IV sufijada (últimos 16 bytes)
	if raw.size() >= 32 and (raw.size() - 16) % 16 == 0:
		var t3 = decrypt_with_suffixed_iv(raw)
		if t3 != "":
			if debug_logs:
				print("[AES] base64: IV sufijada OK")
			return t3

	# 4) Señaliza formato OpenSSL "Salted__"
	if raw.size() >= 16 and raw.slice(0, 8).get_string_from_utf8() == "Salted__":
		push_error("AES: Detectado encabezado OpenSSL 'Salted__'. Ese formato usa contraseña/KDF; no es compatible con KEY/IV directas. Genera con -K <hex> y -iv <hex> y -nosalt.")

	push_error("AES: decrypt_base64 no pudo descifrar (KEY/IV o formato no coinciden).")
	return ""

# =========================
# (Opcional) IV aleatoria por mensaje (IV prefijada)
# =========================
func encrypt_with_random_iv(text: String) -> PackedByteArray:
	if not _key_iv_ok():
		return PackedByteArray()
	var iv = Crypto.new().generate_random_bytes(16)
	var data: PackedByteArray = text.to_utf8_buffer()

	# PKCS7
	var pad = 16 - (data.size() % 16)
	var i = 0
	while i < pad:
		data.append(pad)
		i += 1

	var aes = AESContext.new()
	var rc = aes.start(AESContext.MODE_CBC_ENCRYPT, AES_KEY, iv)
	if rc != OK:
		push_error("AES: start ENCRYPT rc=%d" % rc)
		return PackedByteArray()

	var enc = aes.update(data)
	aes.finish()

	# Prefijar IV
	var out = PackedByteArray()
	out.append_array(iv)
	out.append_array(enc)
	return out

func decrypt_with_prefixed_iv(raw: PackedByteArray) -> String:
	if not _key_iv_ok():
		return ""
	if raw.size() < 16 or (raw.size() - 16) % 16 != 0:
		push_error("AES: buffer con IV prefijada inválido (len=%d)." % raw.size())
		return ""
	var iv = raw.slice(0, 16)
	var data = raw.slice(16, raw.size())

	var aes = AESContext.new()
	var rc = aes.start(AESContext.MODE_CBC_DECRYPT, AES_KEY, iv)
	if rc != OK:
		push_error("AES: start DECRYPT rc=%d" % rc)
		return ""

	var dec = aes.update(data)
	aes.finish()

	if dec.is_empty():
		push_error("AES: decrypt vacío (KEY/IV incorrectas o datos corruptos).")
		return ""

	var pad = int(dec[dec.size() - 1])
	if pad <= 0 or pad > 16 or pad > dec.size():
		push_error("AES: padding PKCS7 inválido (%d)." % pad)
		return ""
	var i = 0
	while i < pad:
		if int(dec[dec.size() - 1 - i]) != pad:
			push_error("AES: padding inconsistente (probable KEY/IV incorrectas).")
			return ""
		i += 1

	dec = dec.slice(0, dec.size() - pad)
	return dec.get_string_from_utf8()

func decrypt_with_suffixed_iv(raw: PackedByteArray) -> String:
	if not _key_iv_ok():
		return ""
	if raw.size() < 16 or (raw.size() - 16) % 16 != 0:
		push_error("AES: buffer con IV sufijada inválido (len=%d)." % raw.size())
		return ""
	var iv = raw.slice(raw.size() - 16, raw.size())
	var data = raw.slice(0, raw.size() - 16)

	var aes = AESContext.new()
	var rc = aes.start(AESContext.MODE_CBC_DECRYPT, AES_KEY, iv)
	if rc != OK:
		push_error("AES: start DECRYPT rc=%d" % rc)
		return ""

	var dec = aes.update(data)
	aes.finish()

	if dec.is_empty():
		push_error("AES: decrypt vacío (KEY/IV incorrectas o datos corruptos).")
		return ""

	var pad = int(dec[dec.size() - 1])
	if pad <= 0 or pad > 16 or pad > dec.size():
		push_error("AES: padding PKCS7 inválido (%d)." % pad)
		return ""
	var i = 0
	while i < pad:
		if int(dec[dec.size() - 1 - i]) != pad:
			push_error("AES: padding inconsistente (probable KEY/IV incorrectas).")
			return ""
		i += 1

	dec = dec.slice(0, dec.size() - pad)
	return dec.get_string_from_utf8()

# =========================
# Utils
# =========================
func _key_iv_ok() -> bool:
	var k = AES_KEY.size()
	var v = AES_IV.size()
	if not (k == 16 or k == 24 or k == 32):
		push_error("AES: KEY inválida (len=%d; espera 16/24/32)" % k)
		return false
	if v != 16:
		push_error("AES: IV inválida (len=%d; espera 16)" % v)
		return false
	return true

func debug_fingerprint() -> String:
	var kb = Marshalls.raw_to_base64(AES_KEY)
	var ib = Marshalls.raw_to_base64(AES_IV)
	return "KEY(%d):%s…  IV(16):%s…" % [AES_KEY.size(), kb.left(8), ib.left(8)]

func _normalize_b64(s: String) -> String:
	var t = s.strip_edges().replace("\n","").replace("\r","").replace(" ","")
	t = t.replace("-", "+").replace("_", "/")
	var rem = t.length() % 4
	if rem == 2:
		t += "=="
	elif rem == 3:
		t += "="
	elif rem == 1:
		return ""
	return t

func _b64_to_raw(s: String) -> PackedByteArray:
	if typeof(s) != TYPE_STRING:
		push_error("AES: se esperaba String base64.")
		return PackedByteArray()
	var t = _normalize_b64(s)
	if t == "":
		push_error("AES: longitud Base64 inválida (mod4==1).")
		return PackedByteArray()
	var raw = Marshalls.base64_to_raw(t)
	if raw.is_empty():
		push_error("AES: base64_to_raw devolvió vacío (payload corrupto).")
	return raw

func _hex_to_pba(hex: String) -> PackedByteArray:
	var s = hex.strip_edges().to_upper().replace(" ", "")
	var out = PackedByteArray()
	if s.length() % 2 != 0:
		return out
	var i = 0
	while i < s.length():
		out.append(int("0x" + s.substr(i, 2)))
		i += 2
	return out
