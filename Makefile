.PHONY: build code-run-compose code-stop

IMAGE_NAME = calendar-slot-code
DB_CONTAINER = calendar-slot-postgres

build:
	docker build -t $(IMAGE_NAME):local .

code-stop:
	docker rm -f $(DB_CONTAINER) >/dev/null 2>&1 || true
	docker rm -f $(IMAGE_NAME) >/dev/null 2>&1 || true

code-run-compose: code-stop
	docker run -d --rm \
		--name $(DB_CONTAINER) \
		--network container:$${HOSTNAME} \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=booking_service \
		postgres:16-alpine
	while ! docker exec $(DB_CONTAINER) pg_isready -U postgres -q; do sleep 1; done
	docker rm -f $(IMAGE_NAME) >/dev/null 2>&1 || true
	docker run --rm \
		--name $(IMAGE_NAME) \
		--network container:$${HOSTNAME} \
		-e PORT=8080 \
		-e DATABASE_URL=postgresql://postgres:postgres@localhost:5432/booking_service?schema=public \
		$(IMAGE_NAME):local
