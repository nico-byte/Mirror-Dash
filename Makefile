.PHONY: dev client server

# Run the server and client concurrently
dev:
	@echo "Starting server and client..."
	@trap 'echo "Stopping..."; kill 0' SIGINT SIGTERM EXIT; \
	( \
		cd ./server && npm run nodemon & \
		cd ./client && npm run dev & \
		wait \
	)

client:
	cd ./client && npm run dev

server:
	cd ./server && npm run nodemon