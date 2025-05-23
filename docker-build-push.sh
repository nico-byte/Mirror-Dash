#!/bin/bash

# Check if Docker Hub username was provided
if [ -z "$1" ]; then
  echo "Error: No Docker Hub username provided"
  echo "Usage: ./docker-build-push.sh <dockerhub-username> [tag]"
  exit 1
fi

DOCKER_USERNAME=$1
TAG=${2:-latest}  # Use provided tag or default to 'latest'

./docker-build-push-client.sh $DOCKER_USERNAME $TAG
./docker-build-push-server.sh $DOCKER_USERNAME $TAG
