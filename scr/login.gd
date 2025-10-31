extends Control

@onready var username : LineEdit = get_node("Background/LoginPanel/VBoxContainer/username")
@onready var password : LineEdit = get_node("Background/LoginPanel/VBoxContainer/password")
@onready var panellogin : Panel = get_node("Background/LoginPanel")
@onready var panelregister : Panel = get_node("Background/Register")
@onready var registerusername : LineEdit = get_node("Background/Register/VBoxContainer/username")
@onready var registerpassword : LineEdit = get_node("Background/Register/VBoxContainer/password")
@onready var registeremail : LineEdit = get_node("Background/Register/VBoxContainer/email")
@onready var message : RichTextLabel = get_node("Background/MessagePanel/Message")
@onready var messagepanel : Panel = get_node("Background/MessagePanel")

enum state {ok,fail,alert,correct}
var database = Db
var connection = ENet

func _ready() -> void:
	Db.db_check()
	var a = OS.get_cmdline_args()
	for args in a:
		if args == "--Server":
			connection.server()
			get_window().title = "ByeTale - BETA 0.0.1 - SERVER TEST"
		if args == "--Client":
			connection.startconnect()
			get_window().title = "ByeTale - BETA 0.0.1 - NETWORK TEST"

func try_loggin() -> void:
	var encoded_username = Marshalls.utf8_to_base64(username.text)
	var encrypted_password = Cifrado.encrypt_base64(password.text)
	SendLoginAccount.rpc_id(1,encoded_username,encrypted_password)


func register_pressed() -> void:
	var encrypted_password = Cifrado.aes_encrypt(registerpassword.text)
	var encoded_password = Marshalls.raw_to_base64(encrypted_password)
	SendDataAccount.rpc_id(1,registerusername.text,encoded_password,registeremail.text)

@rpc("any_peer","reliable")
func SendLoginAccount(_username: String, _password: String):
	if multiplayer.is_server():
		var decoded_username = Marshalls.base64_to_utf8(_username)
		var encrypted_password = Marshalls.base64_to_raw(_password)
		var resolve_password := Cifrado.decrypt_base64(_password)  # <-- sin base64_to_raw manual
		rpc_id(multiplayer.get_remote_sender_id(),"return_connection",database.check_same_password(decoded_username,resolve_password),decoded_username)
		Log.log_create("El id: %s intento conectarse a la cuenta: %s. Resultado: %s"%[multiplayer.get_remote_sender_id(),decoded_username,str(database.check_same_password(decoded_username,resolve_password))])

@rpc("any_peer","reliable")
func return_connection(is_ok,_username):
	if is_ok:
		message_send("Acceso concedido.",state.correct)
	else:
		message_send("Los datos no son correctos.",state.fail)



@rpc("any_peer","reliable")
func SendDataAccount(_username: String, _password: String,email:String):
	if multiplayer.is_server():
		var resolve_password := Cifrado.decrypt_base64(_password)
		rpc_id(multiplayer.get_remote_sender_id(),"return_register",database.create_account(_username,resolve_password,email))


@rpc("any_peer","reliable")
func return_register(is_ok):
	if is_ok:
		message_send("Cuenta creada con exito.",state.correct)
	else:
		message_send("No se pudo crear la cuenta.",state.fail)


func back_to_menu() -> void:
	panellogin.show()
	panelregister.hide()


func register_panel() -> void:
	panellogin.hide()
	panelregister.show()

func message_send(messagerecived:String,stat:state = state.ok):
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
	await (get_tree().create_timer(3).timeout)
	messagepanel.hide()
