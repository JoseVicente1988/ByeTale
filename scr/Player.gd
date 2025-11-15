extends CharacterBody3D

@export var speed: float = 6.0
@export var jump_velocity: float = 4.5
@export var gravity: float = 9.8

@onready var cam_pivot: Node3D = $CameraPivot
@onready var cam: Camera3D = $CameraPivot/Camera3D

@export var camera_height: float = 1.6
@export var camera_distance: float = 6.0
@export var mouse_sensitivity: float = 0.08
@export var min_pitch_deg: float = -60.0
@export var max_pitch_deg: float = 40.0
@export var capture_mouse_on_ready: bool = true

var _yaw_deg: float = 0.0
var _pitch_deg: float = 10.0

var is_owner: bool = false
var map_node: Node = null   # StartMap / Blockout


func _ready() -> void:
	var my_uid: int = multiplayer.get_unique_id()
	var id_from_name: int = -1

	if name.is_valid_int():
		id_from_name = name.to_int()

	is_owner = (id_from_name == my_uid)

	_resolve_map_node()
	call_deferred("_setup_camera")


func _resolve_map_node() -> void:
	if map_node != null and is_instance_valid(map_node):
		return

	var root: Node = get_tree().root

	var found: Node = root.find_child("Blockout", true, false)
	if found == null:
		found = root.find_child("StartMap", true, false)

	if found != null:
		map_node = found


func _setup_camera() -> void:
	cam.current = false
	if is_owner:
		cam.make_current()
		cam_pivot.position = Vector3(0.0, camera_height, 0.0)
		cam.position = Vector3(0.0, 0.0, camera_distance)
		_apply_pivot_rotation()
		if capture_mouse_on_ready:
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)


func _physics_process(delta: float) -> void:
	if not is_owner:
		return

	if map_node == null or not is_instance_valid(map_node):
		_resolve_map_node()

	var forward: Vector3 = -cam_pivot.global_transform.basis.z
	var right: Vector3 = cam_pivot.global_transform.basis.x
	forward.y = 0.0
	right.y = 0.0
	forward = forward.normalized()
	right = right.normalized()

	var f: float = Input.get_action_strength("move_forward") - Input.get_action_strength("move_back")
	var r: float = Input.get_action_strength("move_right") - Input.get_action_strength("move_left")
	var move_dir: Vector3 = (forward * f) + (right * r)
	if move_dir.length() > 1.0:
		move_dir = move_dir.normalized()

	velocity.x = move_dir.x * speed
	velocity.z = move_dir.z * speed

	if not is_on_floor():
		velocity.y -= gravity * delta
	if is_on_floor() and Input.is_action_just_pressed("jump"):
		velocity.y = jump_velocity

	move_and_slide()

	cam_pivot.position.y = camera_height
	cam.position = Vector3(0.0, 0.0, camera_distance)
	cam.look_at(global_transform.origin + Vector3(0.0, 0.0, camera_height), Vector3.UP)

	_send_net_state()


func _input(event: InputEvent) -> void:
	if not is_owner:
		return

	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		var m: InputEventMouseMotion = event
		_yaw_deg -= m.relative.x * mouse_sensitivity
		_pitch_deg -= m.relative.y * mouse_sensitivity
		if _pitch_deg < min_pitch_deg:
			_pitch_deg = min_pitch_deg
		if _pitch_deg > max_pitch_deg:
			_pitch_deg = max_pitch_deg
		_apply_pivot_rotation()

	if event.is_action_pressed("ui_cancel"):
		if Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
			Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
		else:
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)


func _apply_pivot_rotation() -> void:
	cam_pivot.rotation = Vector3(deg_to_rad(_pitch_deg), deg_to_rad(_yaw_deg), 0.0)


func _send_net_state() -> void:
	if not is_owner:
		return

	if not name.is_valid_int():
		return

	if map_node == null or not is_instance_valid(map_node):
		return

	var id_from_name: int = name.to_int()
	map_node.rpc_id(1, "rpc_update_state_from_client", id_from_name, global_transform.origin, rotation)
