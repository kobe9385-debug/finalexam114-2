extends Node2D

@onready var game_manager = $GameManager
@onready var player = $EntityLayer/PlayerCore
@onready var sentence_label = $CanvasLayer/HUD/SentenceLabel
@onready var info_label = $CanvasLayer/HUD/InfoLabel
@onready var enemy_container = $EntityLayer/Enemies

@export var projectile_scene: PackedScene

func _ready() -> void:
    game_manager.sentence_changed.connect(_on_sentence_changed)
    info_label.text = "1 = IGNIS | 2 = SHOT | Arrow Keys = Move"
    spawn_lost_page()

func _input(event: InputEvent) -> void:
    if event.is_action_pressed("cast_ignis"):
        game_manager.add_word("IGNIS")
    if event.is_action_pressed("cast_shot"):
        game_manager.add_word("SHOT")
    if event is InputEventKey and event.pressed and event.keycode == KEY_SPACE:
        try_cast_sentence()

func _on_sentence_changed(words: Array) -> void:
    sentence_label.text = " ".join(words)

func try_cast_sentence() -> void:
    var words = game_manager.current_sentence
    if words == ["IGNIS", "SHOT"]:
        cast_player_ignis_shot()
        game_manager.clear_sentence()
    elif words.size() > 0:
        info_label.text = "Invalid sentence"
        game_manager.clear_sentence()

func cast_player_ignis_shot() -> void:
    var p = projectile_scene.instantiate()
    add_child(p)
    p.global_position = player.global_position + Vector2(60, 0)
    p.direction = Vector2.RIGHT
    p.damage = 25
    p.speed = 520
    info_label.text = "IGNIS SHOT"

func spawn_lost_page() -> void:
    var enemy_scene = preload("res://scenes/battle/Enemy.tscn")
    var e = enemy_scene.instantiate()
    enemy_container.add_child(e)
    e.global_position = Vector2(960, 360)
    e.target_path = e.get_path_to(player)
    e.projectile_scene = projectile_scene
