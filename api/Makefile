COMPOSE_COMMAND := docker-compose
DOCKERFILE := docker-compose.yaml

.PHONY: backend build logs exec down restart psql create-tables migrate seed-interests seed-profiles seed-profiles-force seed-eval verify-seed install test

install:
	poetry install --with dev

test: install
	poetry run pytest -v

backend:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) up --remove-orphans -d

build:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) build --no-cache

logs:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) logs --follow

# Usage: make exec -- poetry run python create_tables.py
exec:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) exec app $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))

create-tables:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) exec app poetry run python create_tables.py

migrate:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) exec app poetry run python migrate.py

seed-interests:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) exec app poetry run python insert_interests.py

seed-profiles:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) exec app poetry run python seed_profiles.py

seed-profiles-force:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) exec app poetry run python seed_profiles.py --force

seed-eval: create-tables seed-interests seed-profiles

verify-seed:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) exec app poetry run python seed_profiles.py --verify

down:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) down

restart: down backend

psql:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) exec db psql -U matcha -d matcha

%:
	@:
