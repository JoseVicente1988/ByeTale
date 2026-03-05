# ByeTale

Experimental MMORPG prototype built with **Godot and ENet multiplayer networking**.

The goal of this project was to explore the architecture required for a multiplayer online game, including authentication, encrypted networking and player synchronization.

## Features implemented

- Login system
- SQLite database persistence
- AES packet encryption
- Player spawning system
- Multiplayer synchronization
- ENet networking architecture

## Architecture

Client (Godot)  
↓  
ENet networking  
↓  
Server handles:

- authentication
- player state
- world synchronization
- persistence

## Why this project exists

This project was created as a technical exploration of the challenges involved in building multiplayer infrastructure for an MMORPG.

Developing a full MMORPG requires large teams and infrastructure, so the project focuses on **core architecture concepts rather than a complete game**.

## Technologies

- Godot Engine
- GDScript
- ENet Multiplayer
- SQLite
- AES encryption

## Status

Prototype / research project.

Core networking and synchronization systems were implemented successfully before the project was paused due to scope complexity.

## Author

José Vicente Vicedo
