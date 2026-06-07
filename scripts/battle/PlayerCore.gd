extends CharacterBody2D

@export var speed: float = 260.0
@export var hp: int = 100

func _physics_process(delta: float) -> void:
    var dir := Vector2.ZERO
    if Input.is_action_pressed("move_left"):
        dir.x -= 1
    if Input.is_action_pressed("move_right"):
        dir.x += 1
    if Input.is_action_pressed("move_up"):
        dir.y -= 1
    if Input.is_action_pressed("move_down"):
        dir.y += 1
    velocity = dir.normalized() * speed
    move_and_slide()

func take_damage(amount: int) -> void:
    hp -= amount
    modulate = Color(1.0, 0.45, 0.35)
    await get_tree().create_timer(0.12).timeout
    modulate = Color.WHITE
    if hp <= 0:
        queue_free()
