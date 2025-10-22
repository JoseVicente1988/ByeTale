extends Node

const ADRESS = "localhost"#aqui ponemos la direccion correspondiente
const PORT = 36890


var eNet = ENetMultiplayerPeer.new()
#region Cliente
#Comenzamos creando la conexion con el servidor mediante ENetMultiplayerPeer
func startconnect()->void:
	if not eNet.get_connection_status() == 0:return #corroboramos que el cliente *NO* esta conectado al servidor
	if eNet.create_client(ADRESS,PORT) == OK: #si la conexion ocurre correctamente
		multiplayer.multiplayer_peer = eNet #asignamos un peer(numero de identificacion) a nuestro cliente
	else:#si la conexion NO ocurre correctamente
		printerr("Fallo en la conexion, tratando de reconectar...")#nos avisa de que no se conecto
		await (get_tree().create_timer(1).timeout)#damos 1 segundo para no crear un loop infinito
		startconnect()#volvemos a llamar a la funcion, para que vuelva a intentarlo


#endregion

#region Servidor
#Creamos el servidor, usando ENetMultiplayerPeer
func server(port:int,max_clients:int)->void:
	if eNet.create_server(port,max_clients) == OK:
		multiplayer.multiplayer_peer = eNet #asignamos el peer 1 al servidor (SIEMPRE ES PEER 1!!)
#endregion
