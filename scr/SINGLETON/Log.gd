extends Node
class_name LogService

const LOG_DIR := "res://log/"

var cfg := ConfigFile.new()

func _ready() -> void:
	# Asegura carpeta de logs
	DirAccess.make_dir_recursive_absolute(LOG_DIR)

func log_create(message: String) -> void:
	var path := _daily_path()
	var _err := cfg.load(path)  # si no existe, cfg queda vacío (ok)

	var section := str("logInfo")  # o "default"
	var key := _timestamp_hms_ms()                   # HH:MM:SS.mmm

	# Evita colisión improbable (mismo ms)
	var suffix := 0
	while cfg.has_section_key(section, key):
		suffix += 1
		key = _timestamp_hms_ms() + "_" + str(suffix)

	cfg.set_value(section, key, str(message))
	var save_err := cfg.save(path)
	if save_err != OK:
		push_error("No se pudo guardar el log: " + path + " (err " + str(save_err) + ")")

func _daily_path() -> String:
	var dt := Time.get_datetime_dict_from_system()
	var y := str(dt["year"])
	var mo := str(dt["month"]).pad_zeros(2)
	var d := str(dt["day"]).pad_zeros(2)
	return LOG_DIR + "/" + y + "-" + mo + "-" + d + ".log.log"

func _timestamp_hms_ms() -> String:
	var dt := Time.get_datetime_dict_from_system()
	var h := str(dt["hour"]).pad_zeros(2)
	var m := str(dt["minute"]).pad_zeros(2)
	var s := str(dt["second"]).pad_zeros(2)
	var ms := str(Time.get_ticks_msec() % 1000).pad_zeros(3)
	return h + ":" + m + ":" + s + " - " + ms + "ms"
