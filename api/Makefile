COMPOSE_COMMAND := "docker-compose"
DOCKERFILE := "docker-compose.yaml"
ARGS := $(wordlist 2,$(words $(filter-out $@,$(MAKECMDGOALS))),$(filter-out $@,$(MAKECMDGOALS)))

.PHONY: backend
backend:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) up --remove-orphans --build -d

.PHONY: build
build:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) build --no-cache 

.PHONY: logs
logs:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) logs --follow

.PHONY: exec
exec:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) exec app $(ARGS)

.PHONY: up down restart logs ps create-bucket


down:
	docker-compose down

restart: down up

logs:
	docker-compose logs -f

ps:
	docker-compose ps

.PHONY: psql
psql:
	$(COMPOSE_COMMAND) -f $(DOCKERFILE) exec db psql -U postgres -d postgres

%:
	@:%