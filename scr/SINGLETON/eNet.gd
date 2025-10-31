extends Node



const ADRESS = "localhost"#aqui ponemos la direccion correspondiente
const PORT = 3689



var eNet = ENetMultiplayerPeer.new()

#region General
func _ready() -> void:
	multiplayer.peer_connected.connect(_on_peer_connected)
	multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	multiplayer.connected_to_server.connect(_on_connected_ok)
	multiplayer.connection_failed.connect(_on_connected_fail)
	multiplayer.server_disconnected.connect(_on_server_kick)


func _on_peer_connected(id: int) -> void:
	if multiplayer.is_server():
		Log.log_create("El id: " + str(id) +" se unio a la partida.")

func _on_peer_disconnected(id: int) -> void:
	if multiplayer.is_server():
		Log.log_create("El id: " + str(id) +" se desconecto de la partida.")

func _on_connected_ok() -> void:
	print("Conectado al servidor.")

func _on_connected_fail() -> void:
	printerr("No se conecto al servidor, error: ", eNet.get_packet_error())

func _on_server_kick() -> void:
	if multiplayer.is_server():
		Log.log_create("Fuiste expulsado de la partida.")

#endregion


#region Cliente
#Comenzamos creando la conexion con el servidor mediante ENetMultiplayerPeer
func startconnect()->void:
	if not eNet.get_connection_status() == 0:return #corroboramos que el cliente *NO* esta conectado al servidor
	if eNet.create_client(ADRESS,PORT) == OK: #si la conexion ocurre correctamente
		multiplayer.multiplayer_peer = eNet #asignamos un peer(numero de identificacion) a nuestro cliente
	else:#si la conexion NO ocurre correctamente
		rpc_id(1,"_search_debug","Status","Fallo en la conexion, tratando de reconectar...")#nos avisa de que no se conecto
		await (get_tree().create_timer(1).timeout)#damos 1 segundo para no crear un loop infinito
		startconnect()#volvemos a llamar a la funcion, para que vuelva a intentarlo


#endregion

#region Servidor
#Creamos el servidor, usando ENetMultiplayerPeer
func server(max_clients:int= 4019)->void:
	if eNet.create_server(PORT,max_clients) == OK:
		multiplayer.multiplayer_peer = eNet #asignamos el peer 1 al servidor (SIEMPRE ES PEER 1!!)
	else:
		rpc_id(1,"_search_debug","Status","No se pudo crear el servidor.")
#endregion

@rpc("any_peer","call_local","reliable")
func _search_debug(_sign:String,message:String):
	var n: Node = get_node_or_null("/root/DebugNetwork")
	if n != null:
		return n.emit_signal(_sign,message)
