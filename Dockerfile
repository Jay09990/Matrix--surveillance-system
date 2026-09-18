# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.14.1

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine AS base

# Set working directory for all build stages.
WORKDIR /usr/src/app


################################################################################
# Create a stage for installing production dependencies.
FROM base AS deps

# Download dependencies as a separate step to take advantage of Docker's caching.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

################################################################################
# Create a stage for building the application.
FROM base AS build

# Download all dependencies (dev + prod) for building.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

# Copy the rest of the source files into the image.
COPY . .

# Run the build script.
RUN npm run build

################################################################################
# Development stage: includes all dependencies + source for hot-reload
FROM base AS dev

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN chown -R node:node /usr/src/app

USER node

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


################################################################################
# Production stage: runs pre-built dist with preview server
FROM base AS prod

# Use production node environment.
ENV NODE_ENV=production

# Run the application as a non-root user.
USER node

# Copy package.json so that package manager commands can be used.
COPY package.json .

# Copy the production dependencies from the deps stage.
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy the built application from the build stage.
COPY --from=build /usr/src/app/dist ./dist

# Expose the port that the preview server listens on.
EXPOSE 4173

# Run the preview server.
CMD ["npm", "run", "preview"]
