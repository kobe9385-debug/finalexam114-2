extends Area2D

@export var hp: int = 60
@export var cast_interval: float = 2.2
@export var projectile_scene: PackedScene
@export var target_path: NodePath

var cast_timer: float = 0.0
var target: Node2D

func _ready() -> void:
    target = get_node_or_null(target_path)
    cast_timer = cast_interval

func _process(delta: float) -> void:
    cast_timer -= delta
    if cast_timer <= 0:
        cast_timer = cast_interval
        cast_ignis_shot()

func take_damage(amount: int) -> void:
    hp -= amount
    modulate = Color(1.0, 0.5, 0.35)
    await get_tree().create_timer(0.08).timeout
    modulate = Color.WHITE
    if hp <= 0:
        queue_free()

func cast_ignis_shot() -> void:
    if projectile_scene == null or target == null:
        return
    var p = projectile_scene.instantiate()
    get_tree().current_scene.add_child(p)
    p.global_position = global_position
    p.direction = (target.global_position - global_position).normalized()
    p.damage = 10
    p.speed = 240
