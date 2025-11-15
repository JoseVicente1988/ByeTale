extends Node3D

@export var player_scene: PackedScene

@onready var players_root: Node3D = $Spawner

var spawned_peers: Dictionary = {}     # peer_id -> true
var ready_peers: Dictionary = {}       # peer_id -> true
var spawn_positions: Dictionary = {}   # peer_id -> Vector3


func _ready() -> void:
	if player_scene == null:
		push_error("StartMap: 'player_scene' no asignado.")
		return

	var my_id: int = multiplayer.get_unique_id()

	if multiplayer.is_server():
		ready_peers[my_id] = true
		multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	else:
		rpc_id(1, "rpc_client_ready", my_id)


@rpc("any_peer")
func rpc_client_ready(peer_id: int) -> void:
	if not multiplayer.is_server():
		return

	ready_peers[peer_id] = true

	if not spawned_peers.has(peer_id):
		spawned_peers[peer_id] = true

		var spawn_pos: Vector3 = _get_spawn_position_for_peer(peer_id)
		_spawn_local_player(peer_id, spawn_pos)

		for other_peer_id in ready_peers.keys():
			if other_peer_id == multiplayer.get_unique_id():
				continue
			rpc_id(other_peer_id, "rpc_spawn_player_with_state", peer_id, spawn_pos, Vector3.ZERO)

	for existing_peer_id in spawned_peers.keys():
		if existing_peer_id == peer_id:
			continue

		if not players_root.has_node(str(existing_peer_id)):
			continue

		var existing_player: CharacterBody3D = players_root.get_node(str(existing_peer_id))
		if existing_player == null or not is_instance_valid(existing_player):
			continue

		var pos: Vector3 = existing_player.global_transform.origin
		var rot: Vector3 = existing_player.rotation

		rpc_id(peer_id, "rpc_spawn_player_with_state", existing_peer_id, pos, rot)


func _get_spawn_position_for_peer(peer_id: int) -> Vector3:
	if spawn_positions.has(peer_id):
		return spawn_positions[peer_id]

	var base: Vector3 = players_root.global_transform.origin
	var index: int = spawn_positions.size()
	var spacing: float = 2.5
	var offset: Vector3 = Vector3(float(index) * spacing, 0.0, 0.0)
	var final_pos: Vector3 = base + offset

	spawn_positions[peer_id] = final_pos
	return final_pos


func _spawn_local_player(peer_id: int, pos: Vector3) -> void:
	if players_root.has_node(str(peer_id)):
		return

	if player_scene == null:
		push_error("StartMap: 'player_scene' es null al intentar spawnear.")
		return

	var p: CharacterBody3D = player_scene.instantiate()
	p.name = str(peer_id)

	players_root.add_child(p)
	p.global_transform.origin = pos


@rpc("any_peer")
func rpc_spawn_player_with_state(peer_id: int, pos: Vector3, rot: Vector3) -> void:
	if players_root.has_node(str(peer_id)):
		return

	if player_scene == null:
		push_error("StartMap: 'player_scene' es null en rpc_spawn_player_with_state.")
		return

	var p: CharacterBody3D = player_scene.instantiate()
	p.name = str(peer_id)

	players_root.add_child(p)
	p.global_transform.origin = pos
	p.rotation = rot


func _on_peer_disconnected(peer_id: int) -> void:
	if not multiplayer.is_server():
		return

	ready_peers.erase(peer_id)
	spawned_peers.erase(peer_id)
	spawn_positions.erase(peer_id)

	_despawn_local_player(peer_id)

	for other_peer_id in ready_peers.keys():
		if other_peer_id == multiplayer.get_unique_id():
			continue
		rpc_id(other_peer_id, "rpc_despawn_player", peer_id)


@rpc("any_peer")
func rpc_despawn_player(peer_id: int) -> void:
	_despawn_local_player(peer_id)


func _despawn_local_player(peer_id: int) -> void:
	if players_root.has_node(str(peer_id)):
		var p: Node = players_root.get_node(str(peer_id))
		p.queue_free()


@rpc("any_peer", "unreliable")
func rpc_update_state_from_client(peer_id: int, pos: Vector3, rot: Vector3) -> void:
	if not multiplayer.is_server():
		return

	_apply_state_local(peer_id, pos, rot)

	for other_peer_id in ready_peers.keys():
		if other_peer_id == peer_id:
			continue
		if other_peer_id == multiplayer.get_unique_id():
			continue
		rpc_id(other_peer_id, "rpc_apply_state", peer_id, pos, rot)


@rpc("any_peer", "unreliable")
func rpc_apply_state(peer_id: int, pos: Vector3, rot: Vector3) -> void:
	_apply_state_local(peer_id, pos, rot)


func _apply_state_local(peer_id: int, pos: Vector3, rot: Vector3) -> void:
	if not players_root.has_node(str(peer_id)):
		return

	var player: CharacterBody3D = players_root.get_node(str(peer_id))

	if multiplayer.get_unique_id() == peer_id:
		return

	player.global_transform.origin = pos
	player.rotation = rot
