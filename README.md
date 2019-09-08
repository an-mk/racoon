# RACOON

Judge system in development

## Requirements
- NodeJS
- NPM
- Docker Machine

## Installation
### Windows
1. Download an install NodeJS and Npm: [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
2. Clone racoon from git and install with npm

```
git clone https://github.com/an-mk/racoon
cd racoon
npm install -g ./
```

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
Linux ssie xD
