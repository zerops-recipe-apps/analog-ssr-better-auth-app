# Zerops x Analog Ssr Better Auth

<!-- #ZEROPS_EXTRACT_START:intro# -->
<!-- #ZEROPS_EXTRACT_END:intro# -->

![analog cover](https://github.com/zeropsio/recipe-shared-assets/blob/main/covers/svg/cover-analog.svg)

## Deploy to Zerops

Click the deploy button to deploy directly to Zerops.

[![Deploy on Zerops](https://github.com/zeropsio/recipe-shared-assets/blob/main/deploy-button/light/deploy-button.svg)](https://app.zerops.io/recipes/analog-ssr-better-auth?environment=small-production)

## Integration Guide

<!-- #ZEROPS_EXTRACT_START:integration-guide# -->
### 1. Adding `zerops.yaml`

The main configuration file — place at repository root. It tells Zerops how to build, deploy and run your app. This one declares 2 setups (`dev`, `prod`), runs `initCommands` at boot (migrations), and ships readiness + health checks.

```yaml
zerops:
  - setup: prod
    build:
      base: nodejs@22
      buildCommands:
        - npm ci
        - node scripts/bundle-migrate.mjs
        - NODE_OPTIONS=--max-old-space-size=1500 npm run build
      deployFiles:
        - dist/analog
        - migrate.cjs
      cache:
        - node_modules
    deploy:
      readinessCheck:
        httpGet:
          port: 3000
          path: /
    run:
      base: nodejs@22
      initCommands:
        - zsc execOnce ${appVersionId} --retryUntilSuccessful -- node migrate.cjs
      ports:
        - port: 3000
          httpSupport: true
      envVariables:
        NODE_ENV: production
        DB_HOST: ${db_hostname}
        DB_PORT: ${db_port}
        DB_NAME: ${db_dbName}
        DB_USER: ${db_user}
        DB_PASSWORD: ${db_password}
        APP_URL: ${zeropsSubdomain}
      start: node dist/analog/server/index.mjs
      healthCheck:
        httpGet:
          port: 3000
          path: /

  - setup: dev
    build:
      base: nodejs@22
      os: ubuntu
      buildCommands:
        - npm install
      deployFiles: ./
      cache:
        - node_modules
    run:
      base: nodejs@22
      os: ubuntu
      initCommands:
        - zsc execOnce ${appVersionId} --retryUntilSuccessful -- node scripts/migrate.mjs
      ports:
        - port: 5173
          httpSupport: true
      envVariables:
        NODE_ENV: development
        DB_HOST: ${db_hostname}
        DB_PORT: ${db_port}
        DB_NAME: ${db_dbName}
        DB_USER: ${db_user}
        DB_PASSWORD: ${db_password}
        APP_URL: ${zeropsSubdomain}
      start: zsc noop --silent
```
<!-- #ZEROPS_EXTRACT_END:integration-guide# -->

<!-- #ZEROPS_EXTRACT_START:knowledge-base# -->

<!-- #ZEROPS_EXTRACT_END:knowledge-base# -->
