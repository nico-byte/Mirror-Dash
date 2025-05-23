#!/bin/bash

# Check if Docker Hub username was provided
if [ -z "$1" ]; then
  echo "Error: No Docker Hub username provided"
  echo "Usage: ./docker-build-push.sh <dockerhub-username> [tag]"
  exit 1
fi

DOCKER_USERNAME=$1
TAG=${2:-latest}  # Use provided tag or default to 'latest'

echo "Building and pushing Docker image with tag: $TAG"

# Ensure you're logged in to Docker Hub
echo "Please log in to Docker Hub:"
docker login

# Build and push client image
echo "Building client image..."
docker buildx build -t $DOCKER_USERNAME/mirror-dash-client:$TAG --platform linux/amd64,linux/arm64 ./client

echo "Pushing client image to Docker Hub..."
docker push $DOCKER_USERNAME/mirror-dash-client:$TAG

echo "Successfully built and pushed Docker image to Docker Hub!"
echo "Client image: $DOCKER_USERNAME/mirror-dash-client:$TAG"
