#!/bin/bash
# execute as ./runDaemon.sh 
# copy variables to other shells (they are here only for readability)

export RACOONDOCKERHOST=127.0.0.1
export RACOONDOCKERPORT=2376

function delayed_sock()
{
    sleep 10
    sudo setfacl --modify user:$USER:rw /var/run/docker.sock
}

delayed_sock &

sudo dockerd -H tcp://$RACOONDOCKERHOST:$RACOONDOCKERPORT -H unix:///var/run/docker.sock