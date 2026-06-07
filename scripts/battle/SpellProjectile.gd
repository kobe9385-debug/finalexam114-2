extends Area2D

@export var speed: float = 520.0
@export var damage: int = 25
@export var direction: Vector2 = Vector2.RIGHT
@export var lifetime: float = 2.5

func _ready() -> void:
    body_entered.connect(_on_body_entered)
    area_entered.connect(_on_area_entered)

func _process(delta: float) -> void:
    position += direction.normalized() * speed * delta
    lifetime -= delta
    if lifetime <= 0:
        queue_free()

func _on_body_entered(body: Node) -> void:
    if body.has_method("take_damage"):
        body.take_damage(damage)
        queue_free()

func _on_area_entered(area: Area2D) -> void:
    if area.has_method("take_damage"):
        area.take_damage(damage)
        queue_free()
