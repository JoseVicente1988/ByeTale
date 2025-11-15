extends Node

var DB_PATH: String = "res://accounts.db"
var SQL: SQLite = SQLite.new()

var TABLE_DEFINITION: Dictionary = {
	"id": {"data_type": "int", "primary_key": true, "auto_increment": true},
	"usrname": {"data_type": "text", "unique": true, "not_null": true},
	"password": {"data_type": "text", "not_null": true},
	"email": {"data_type": "text", "unique": true, "not_null": true},
	"map": {"data_type": "text", "not_null": true},
	"position": {"data_type": "text", "not_null": true}
}

var TABLE_PLAYER_DATA_ASPECT: Dictionary = {
	"id": {"data_type": "int", "primary_key": true},
	"hair": {"data_type": "int"},
	"gamename": {"data_type": "text", "not_null": true, "unique": true},
	"face": {"data_type": "int"},
	"color": {"data_type": "int"}
}


func _ready() -> void:
	db_check()


func db_check() -> void:
	SQL.path = DB_PATH
	if not FileAccess.file_exists(DB_PATH):
		print("Creando base de datos")
		if SQL.open_db():
			SQL.create_table("accounts", TABLE_DEFINITION)
			SQL.create_table("aspect", TABLE_PLAYER_DATA_ASPECT)
			SQL.close_db()
			print("Creado con exito!.")
		else:
			print("no se puede hacer nada ahora")
	else:
		print("Ya existe la base de datos.")


func create_account(username: String, password: String, email: String)->bool:
	if not multiplayer.is_server(): return false
	SQL.open_db()
	var query = "INSERT INTO accounts (usrname, password, email, map, position) VALUES (?, ?, ?, ?, ?);"
	var ok = SQL.query_with_bindings(query, [username, password, email,"starter","0,0,0"])
	SQL.close_db()
	if not ok:
		return false
	# Comprobación simple: usa tus funciones (cada una abre/cierra lo suyo)
	var id = _get_id(username)
	if id > 0:
		if _row_list_id().has(id):
			print("Ya hay un personaje creado, continuando.")
			Log.log_create.rpc_id(1,"[CORRECTO] El id: %s se conecto en la cuenta: %s."%[multiplayer.get_remote_sender_id(),username])
		else:
			print("No hay personaje, entrando al panel de creación.")
			Log.log_create.rpc_id(1,"[ALERTA!] El id: %s intento conectarse a la cuenta: %s."%[multiplayer.get_remote_sender_id(),username])
	
	return ok

func create_character(username: String, _name: String, hair: int, color: int, face: int) -> bool:
	var id = _get_id(username)
	if id <= 0:
		return false
	if not SQL.open_db():
		return false
	var query = "INSERT INTO aspect (id, gamename, hair, face, color) VALUES (?, ?, ?, ?, ?);"
	var ok = SQL.query_with_bindings(query, [id, _name, hair, face, color])
	SQL.close_db()
	return ok


func _get_id(username: String) -> int:
	var id = 0
	if not SQL.open_db():
		return 0
	var query = "SELECT id FROM accounts WHERE usrname = ? LIMIT 1;"
	if SQL.query_with_bindings(query, [username]):
		var rows = SQL.query_result  # esperado: [ {"id": X} ]
		if typeof(rows) == TYPE_ARRAY and rows.size() > 0:
			var row = rows[0]
			if typeof(row) == TYPE_DICTIONARY and row.has("id"):
				id = int(row["id"])
	SQL.close_db()
	return id

func _get_map(username: String) -> String:
	var result
	if not SQL.open_db():
		return "fallo"
	var query = "SELECT map FROM accounts WHERE usrname = ? LIMIT 1;"
	if SQL.query_with_bindings(query, [username]):
		result = str(SQL.query_result)  # esperado: [ {"id": X} ]
	SQL.close_db()
	return result

func check_same_password(username: String, taken_password: String) -> bool:
	if not multiplayer.is_server(): return false
	print("[USERNAME] %s - [PASSWORD] %s" %[username,taken_password])
	if not SQL.open_db():
		push_error("[DB] open_db() falló (check_same_password): %s" % str(SQL.error_message))
		return false
	var ok := SQL.query_with_bindings("SELECT password FROM accounts WHERE usrname = ? LIMIT 1;", [username])
	if not ok:
		push_error("[DB] SELECT falló: %s" % str(SQL.error_message))
		SQL.close_db()
		return false
	var pass_ok := false
	if SQL.query_result.size() > 0:
		pass_ok = (str(SQL.query_result[0]["password"]) == taken_password)
	SQL.close_db()
	return pass_ok


func _row_list_id() -> Array[int]:
	var ids: Array[int] = []
	if not SQL.open_db():
		return ids
	if SQL.query("SELECT id FROM aspect ORDER BY id ASC;"):
		var rows = SQL.query_result  # esperado: [ {"id":1}, {"id":2}, ... ]
		if typeof(rows) == TYPE_ARRAY:
			for row in rows:
				if typeof(row) == TYPE_DICTIONARY and row.has("id"):
					ids.append(int(row["id"]))
	SQL.close_db()
	return ids
