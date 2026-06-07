extends Node

signal battle_won
signal battle_lost
signal sentence_changed(words: Array)

var unlocked_words: Array[String] = ["IGNIS", "SHOT"]
var current_sentence: Array[String] = []

func add_word(word: String) -> void:
    if not unlocked_words.has(word):
        return
    if current_sentence.size() >= 3:
        return
    current_sentence.append(word)
    sentence_changed.emit(current_sentence)

func clear_sentence() -> void:
    current_sentence.clear()
    sentence_changed.emit(current_sentence)
