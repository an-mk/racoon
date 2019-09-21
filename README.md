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
