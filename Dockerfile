# base node image
FROM node:18-slim as base
# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl
# set for base and all layer that inherit from it

# Install all node_modules, including dev dependencies
FROM base as deps

WORKDIR /myapp

COPY package.json package-lock.json ./
RUN npm install --production=false

# Setup production node_modules
FROM base as production-deps
ENV NODE_ENV production

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
COPY package.json package-lock.json ./
RUN npm prune --production

# Build the app
FROM base as build

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules

COPY prisma .
RUN npx prisma generate

COPY . .
RUN npm run build
RUN npm run build:css
RUN npm run post:css

# Finally, build the production image with minimal footprint
FROM base as prod
ENV NODE_ENV production

WORKDIR /myapp

COPY --from=production-deps /myapp/node_modules /myapp/node_modules
COPY --from=build /myapp/node_modules/.prisma /myapp/node_modules/.prisma

COPY --from=build /myapp/build /myapp/build
COPY --from=build /myapp/styles/styles.* /myapp/styles
COPY --from=build /myapp/public /myapp/public
COPY ./bin /myapp/bin
COPY . .

CMD ["/myapp/bin/start.sh"]

# Provide a test container
FROM build as test
ENV NODE_ENV test
COPY --from=build /myapp/jest.config.ts /myapp/jest.config.ts
WORKDIR /myapp
CMD ["npm", "test"]
