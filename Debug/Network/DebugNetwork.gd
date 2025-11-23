extends Control

@warning_ignore("unused_signal")
signal Status(message)

@onready var debuglist : ItemList = get_node("DebugConnection")

var conn = ENet


func _ready() -> void:

	print("Esperando accion...")


func _on_host_pressed() -> void:
	conn.server()
	debuglist.add_item("Servidor en escucha...")


func _on_client_pressed() -> void:
	conn.startconnect()
	


func status_change(message: Variant) -> void:
		debuglist.add_item(str(message))
