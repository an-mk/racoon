# RACOON

Judge system in development

## Requirements
- NodeJs
- NPM
- Docker Machine

## Installation
### Windows
1. Download an install NodeJs and Npm: [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
2. Install all dependencies with npm
3. Download and install [Docker Toolbox](https://github.com/docker/toolbox/releases "Docker Toolbox")
4. Temporary solution to mitigate TLS connection errors:
Open Docker Terminal
    - type
    >docker-machine ssh
    - navigate to
	>/var/lib/boot2docker/
	- execute
	>sudo vi profile
	- modify value `DOCKER_TLS` from `auto` to `no`
	- exit Docker Machine (`exit`)
	- reboot the machine by typing:
	> docker-machine restart
5. Download example docker image
In Docker Terminal type `docker-machine ssh`, then `docker pull gcc`
Wait for it, then you may run the app.
You should get the gcc version printed on the screen.

### Linux
Linux ssie xD
