extends Control

@onready var username: LineEdit = get_node("Background/LoginPanel/VBoxContainer/username")
@onready var password: LineEdit = get_node("Background/LoginPanel/VBoxContainer/password")
@onready var panellogin: Panel = get_node("Background/LoginPanel")
@onready var panelregister: Panel = get_node("Background/Register")
@onready var registerusername: LineEdit = get_node("Background/Register/VBoxContainer/username")
@onready var registerpassword: LineEdit = get_node("Background/Register/VBoxContainer/password")
@onready var registeremail: LineEdit = get_node("Background/Register/VBoxContainer/email")
@onready var message: RichTextLabel = get_node("Background/MessagePanel/Message")
@onready var messagepanel: Panel = get_node("Background/MessagePanel")
@onready var background: Control = get_node("Background")

#CARGA DE MAPAS
var map = preload("res://RESOURCES/Scenary/blockout.tscn")


enum state { ok, fail, alert, correct }

var database = Db
var connection = ENet

func _ready() -> void:
	Db.db_check()

	var args: PackedStringArray = OS.get_cmdline_args()
	for a in args:
		if a == "--Server":
			connection.server()
			get_window().title = "ByeTale - SERVER TEST"
			GenerateStartMap()
			return
		if a == "--Client":
			connection.startconnect()
			get_window().title = "ByeTale - NETWORK TEST"
			await _wait_peer_ready()
			return

	# Sin args: cliente por defecto
	connection.startconnect()
	get_window().title = "ByeTale - NETWORK TEST"
	await _wait_peer_ready()

func _wait_peer_ready() -> void:
	var api: SceneMultiplayer = get_tree().get_multiplayer()
	var t: float = 0.0
	while (api == null or api.multiplayer_peer == null) and t < 5.0:
		await get_tree().process_frame
		t += get_process_delta_time()

func try_loggin() -> void:
	var api: SceneMultiplayer = get_tree().get_multiplayer()
	if api == null or api.multiplayer_peer == null:
		message_send("Conexión no establecida aún.", state.alert)
		Log.error()
		return

	var encoded_username: String = Marshalls.utf8_to_base64(username.text)
	var encrypted_password: String = Cifrado.encrypt_base64(password.text)
	SendLoginAccount.rpc_id(1, encoded_username, encrypted_password)

func register_pressed() -> void:
	var encrypted_password: PackedByteArray = Cifrado.aes_encrypt(registerpassword.text)
	var encoded_password: String = Marshalls.raw_to_base64(encrypted_password)
	SendDataAccount.rpc_id(1, registerusername.text, encoded_password, registeremail.text)

@rpc("any_peer", "reliable")
func SendLoginAccount(_username: String, _password: String) -> void:
	if multiplayer.is_server():
		var decoded_username: String = Marshalls.base64_to_utf8(_username)
		var resolve_password: String = Cifrado.decrypt_base64(_password)
		var ok: bool = database.check_same_password(decoded_username, resolve_password)
		rpc_id(multiplayer.get_remote_sender_id(), "return_connection", ok, decoded_username)
		Log.log_create("El id: %s intento conectarse a la cuenta: %s. Resultado: %s" % [multiplayer.get_remote_sender_id(), decoded_username, str(ok)])

@rpc("any_peer", "reliable")
func return_connection(is_ok: bool, _username: String) -> void:
	if is_ok:
		message_send("Acceso concedido.", state.correct)
		await get_tree().create_timer(1.0).timeout
		GenerateStartMap()
		

	else:
		message_send("Los datos no son correctos.", state.fail)

@rpc("any_peer", "reliable")
func SendDataAccount(_username: String, _password: String, email: String) -> void:
	if multiplayer.is_server():
		var resolve_password: String = Cifrado.decrypt_base64(_password)
		var created: bool = database.create_account(_username, resolve_password, email)
		rpc_id(multiplayer.get_remote_sender_id(), "return_register", created)

@rpc("any_peer", "reliable")
func return_register(is_ok: bool) -> void:
	if is_ok:
		message_send("Cuenta creada con exito.", state.correct)
	else:
		message_send("No se pudo crear la cuenta.", state.fail)

func back_to_menu() -> void:
	panellogin.show()
	panelregister.hide()

func register_panel() -> void:
	panellogin.hide()
	panelregister.show()

func message_send(messagerecived: String, stat: state = state.ok) -> void:
	messagepanel.show()
	match stat:
		state.ok:
			message.text = "[color=white][center]" + messagerecived
		state.fail:
			message.text = "[color=red][center]" + messagerecived
		state.alert:
			message.text = "[color=orange][center]" + messagerecived
		state.correct:
			message.text = "[color=green][center]" + messagerecived
	await get_tree().create_timer(3.0).timeout
	messagepanel.hide()

func GenerateStartMap() -> void:
	background.hide()
	await get_tree().process_frame
	# Instancia el mapa DIRECTO bajo /root con nombre fijo (igual en todos los peers)
	if not map:
		print("No existe el mapa.")
		background.show()
		message_send("No se pudo conectar, contacta con los admins",state.alert)
		Log.error()
	var map_inst: Node = map.instantiate()
	get_tree().root.add_child(map_inst)
