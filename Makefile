

include $(PWD)/backend/.env

up:
	docker compose up --build --remove-orphans -d
down:
	docker compose down
psql:
	docker compose exec db psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)
logs:
	docker compose logs --follow