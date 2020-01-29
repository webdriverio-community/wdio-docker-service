WDIO Docker Service [![Maintainability](https://api.codeclimate.com/v1/badges/fa04188e6558671dbd9e/maintainability)](https://codeclimate.com/github/stsvilik/wdio-docker-service/maintainability) 
[![Build Status](https://travis-ci.org/stsvilik/wdio-docker-service.svg?branch=master)](https://travis-ci.org/stsvilik/wdio-docker-service)
[![Test Coverage](https://api.codeclimate.com/v1/badges/fa04188e6558671dbd9e/test_coverage)](https://codeclimate.com/github/stsvilik/wdio-docker-service/test_coverage)
===

This service is intended for use with [WebdriverIO](http://webdriver.io/) and it helps run functional/integration tests 
against/using containerized applications. It uses popular [Docker](https://www.docker.com/) service (installed separately) to run containers.

## Why use it?
Ideally your tests would run in some variety of CI/CD pipeline where often there are no "real" browsers and other resources
your application depends on. With advent of Docker practically all necessary application dependencies can be containerized.
With this service you may run your application container or a [docker-selenium](https://github.com/SeleniumHQ/docker-selenium) in your CI and in complete isolation 
(assuming CI can have Docker installed as a dependency). Same may apply to local development if your application needs to have a level
of isolation from your main OS.

## How it works
Service will run an existing docker image and once its ready, will initiate WebdriverIO tests that should run against your containerized application.

## Installation

Run:

```bash
npm install wdio-docker-service --save-dev
```

Instructions on how to install WebdriverIO can be found [here](http://webdriver.io/guide/getstarted/install.html).

## Configuration
By default, Google Chrome, Firefox and PhantomJS are available when installed on the host system. 
In order to use the service you need to add `docker` to your service array:

```javascript
// wdio.conf.js
exports.config = {
   // ...
   services: ['docker'],
   // ...
};
```

## Options

### dockerOptions
Various options required to run docker container

Type: `Object`

Default: `{ 
    options: {
        rm: true
    }
}`

Example:

```javascript
dockerOptions: {
    image: 'selenium/standalone-chrome',
    healthCheck: 'http://localhost:4444',
    options: {
        p: ['4444:4444'],
        shmSize: '2g'
    }
}
```

### dockerOptions.image
Docker container name tag. Could be local or from Docker HUB.

Type: `String`

Required: `true`

### dockerOptions.healthCheck
Configuration which checks your containers' readiness before initiating tests. Normally this would be a localhost url.
If healthCheck is not configured, Webdriver will start running tests immediately after Docker container starts, which
maybe too early considering that it takes time for web service to start inside a Docker container.

Type: `String|Object`

Options for Object use:
- *url* - url to an app running inside your container
- *maxRetries* - number of retries until healthcheck fails. Default: 10
- *inspectInterval* - interval between each retry in ms. Default: 500
- *startDelay* - initial delay to begin healthcheck in ms. Default: 0

Example 1 (String): `healthCheck: 'http://localhost:4444'`

Example 2 (Object):

```javascript
healthCheck: {
    url: 'http://localhost:4444',
    maxRetries: 3,
    inspectInterval: 1000,
    startDelay: 2000
}
```

### dockerOptions.options
Map of options used by `docker run` command. For more details on `run` command click [here](https://docs.docker.com/edge/engine/reference/commandline/run/).

Any single-letter option will be converted to `-[option]` (i.e. `d: true` -> `-d`). 

Any option of two-character or more will
be converted to `--[option]` (i.e. `rm: true` -> `--rm`). 

For options that may be used more than once 
(i.e. `-e`,`-add-host`, `--expose`, etc.), please use array notation (i.e. `e: ["NODE_ENV=development", "FOO=bar"]`).

Type: `Object`

Example:

```javascript
options: {
    e: ['NODE_ENV=development', 'PROXY=http://myproxy:80']
    p: ['4444:4444', '5900:5900'],
    shmSize: '2g'
}
```

### dockerOptions.args
Any arguments you may want to pass into container. Corresponds to `[ARG...]` in Docker run CLI.

Type: `String`

### dockerOptions.command
Any command you may want to pass into container. Corresponds to `[COMMAND]` in Docker run CLI.

Type: `String`

### onDockerReady
A callback method which is called when Docker application is ready. Readiness is determined by ability to ping `healthCheck` url.

Type: `Function`

### dockerLogs
Path to where logs from docker container should be stored

Type: `String`

## Testing Use Cases / Recipes
Please visit our [Wiki](https://github.com/stsvilik/wdio-docker-service/wiki) for more details.
