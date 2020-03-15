# RACOON

Judge system in development

## Requirements
- NodeJS
- NPM
- Docker Machine

## Installation

### Windows
1. Download an install NodeJS and Npm: [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
2. Open shell and paste following commands:

   ```
   npm config set @an-mk:registry https://npm.pkg.github.com/
   npm config set //npm.pkg.github.com/:_authToken    4ffb681433494666f0348ea42b7c3eacbbe876c2
   npm install @an-mk/racoon --global --production
   ```
   _First command sets `https://npm.pkg.github.com/` as a registry for `an-mk` organization, second sets read-only authorization token for this registry. Third command installs `racoon` as global package._

   Now you can use `racoon` (cli tool) and start server with `racoon-server` in your shell.

3. Download and install [Docker Toolbox](https://github.com/docker/toolbox/releases "Docker Toolbox")
4. Temporary solution to mitigate TLS connection errors:
Open Docker Terminal
    - type
    ```
	docker-machine ssh
	```
    - navigate to
	```
	/var/lib/boot2docker/
	```
	- execute
	```
	sudo vi profile
	```
	- modify value `DOCKER_TLS` from `auto` to `no`
	- exit Docker Machine (`exit`)
	- reboot the machine by typing:
	```
	docker-machine restart
	```
5. Download example docker image
In Docker Terminal type `docker-machine ssh`, then `docker pull gcc`
Wait for it, then you may run the app.
You should get the gcc version printed on the screen.

### Linux

# Configuration
## Environment variables
Name | Default | Use
--- | --- | ---
RACOONPORT | `3000` | Port on which the app will run.
RACOONDOCKERPROTO | `http` | Protocol for Docker connection.
RACOONDOCKERHOST | `127.0.0.1` | Docker Machine Address
RACOONDOCKERPORT | `2376` | Docker Machine exposed API port
RACOONMONGOPSW | - | Password for MongoDB database
RACOONMONGOHOST | - | MongoDB hostname.
RACOONMONGOUNAME | - | MongoDB username.
RACOONMONGOURL | It sets default database name to `sprawdzarka` | Override other Mongo-related parameters, and pass full URL instead.
RACOONMONGODEBUG | - | More verbose Mongoose logs.
RACOONTMPFILES | `./tmp` | Path to Racoon temp dir.

## Adding languages

```
racoon addLang C++ cpp '#include <iostream>\nusing namespace std;\nint main() {\n\tcout<<\"Hello, World!\";\n\treturn 0;\n}' 'gcc' 'gcc'

racoon addLang C c '#include <stdio.h>\nint main(void) {\n    printf(\"Hello, World!\");\n    return 0;\n}' 'gcc' 'gcc'

racoon addLang Java java 'import java.util.*;\nimport java.lang.*;\nimport java.io.*;\nclass Main\n{\n    public static void main (String[] args) throws java.lang.Exception\n    {\n        System.out.println(\"Hello, World!\");\n    }\n}' 'gcc' 'gcc'

racoon addLang Python python 'print(\"Hello, World!\") ' 'gcc' 'gcc'
```

## Adding problems

```
racoon addProblem Suma '<p>Zsumuj a i b. </p> <b>Przykładowe wejście:</b> <code>a = 2 \nb = 10 </code> <b>Przykładowe wyjście:</b> <code>12</code>'
```
