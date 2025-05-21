#!/bin/bash

# Check if server IP and Docker Hub username were provided
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: ./deploy-dockerhub.sh <server-ip> <dockerhub-username> [tag]"
  exit 1
fi

SERVER_IP=$1
DOCKER_USERNAME=$2
TAG=${3:-latest}  # Use provided tag or default to 'latest'

echo "Deploying Mirror Dash from Docker Hub"
echo "Server IP: $SERVER_IP"
echo "Docker Hub Username: $DOCKER_USERNAME"
echo "Image Tag: $TAG"

# Create the client .env file for production
echo "Creating production .env file..."
cat > ./client/.env.production << EOL
# Production Environment Settings
VITE_SERVER_URL=http://$SERVER_IP:9000
VITE_START_DIRECTLY=false
VITE_SKIP_MENU=false
VITE_SKIP_LOBBY=false
VITE_DIRECT_CONNECT=
VITE_AUTO_SCROLL_CAMERA=true
VITE_CAMERA_SCROLL_SPEED=50
VITE_DEBUG_MODE=false
VITE_INSTANT_DEATH_MODE=false
VITE_DEFAULT_PLAYER_NAME=Player
EOL

# Create a docker-compose.override.yml file for the server
echo "Creating docker-compose file with environment variables..."
cat > docker-compose.override.yml << EOL
version: '3.8'

services:
  client:
    environment:
      - VITE_SERVER_URL=http://$SERVER_IP:9000
EOL

# SSH into the server and set up Docker if it's not already installed
echo "Connecting to server and setting up project.."
ssh root@$SERVER_IP << ENDSSH

# Create the app directory if it doesn't exist
mkdir -p /opt/mirror-dash
ENDSSH

# Copy the docker-compose.yml and docker-compose.override.yml to the server
echo "Copying docker-compose files to server..."
scp docker-compose.yml docker-compose.override.yml root@$SERVER_IP:/opt/mirror-dash/

# SSH into the server and start the containers
echo "Starting the containers on the server..."
ssh root@$SERVER_IP << ENDSSH
cd /opt/mirror-dash
export DOCKER_USERNAME=$DOCKER_USERNAME
export TAG=$TAG

# Pull the latest images
docker pull $DOCKER_USERNAME/mirror-dash-client:$TAG
docker pull $DOCKER_USERNAME/mirror-dash-server:$TAG

# Pull and start the containers
docker compose pull
docker compose up -d --force-recreate

echo "Deployment complete! Your game is now running at http://$SERVER_IP"
ENDSSH

echo "Deployment completed successfully!"
