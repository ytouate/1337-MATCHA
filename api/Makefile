COMPOSE_COMMAND := docker-compose
DOCKERFILE := docker-compose.yaml

.PHONY: backend build logs exec down restart psql create-tables seed-interests

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

seed-interests:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) exec app poetry run python insert_interests.py

test:
	poetry run pytest -v

down:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) down

restart: down backend

psql:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) exec db psql -U matcha -d matcha

%:
	@:
