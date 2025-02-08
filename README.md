# unifoodi_hackathon

# local development

```
npm install

# for development
npm run dev

```

# for docker cleanup
```
# Stop all running containers
docker stop $(docker ps -aq)

# Remove all containers
docker rm $(docker ps -aq)

# Remove the image
docker rmi sqlite-api

# Remove your local node_modules
rm -rf node_modules
```

# for running on docker
```
# Build the new image
docker build -t sqlite-api .

# Run with a volume for the database
docker run -p 3000:3000 -v $(pwd)/data:/app/data sqlite-api

# or could try this:
docker build -t sqlite-api .
docker run -p 3000:3000 sqlite-api
```