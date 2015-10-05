#!/bin/bash

export LOG_DIR="/var/log/hydra"
mkdir -p $LOG_DIR

start() {
    # install dependencies from package.json
    npm install
    # compile
    echo "Building Weka..."
    CDIR=`pwd`
    cd ./lib/aeng/engines/weka/build
    ./compile_all.sh
    cd $CDIR
    echo "Done Building Weka"

    echo "Building Netica..."
    if [[ "$OSTYPE" == "linux"* ]]; then
        echo "... for linux-gnu"
        cd ./lib/aeng/engines/netica/build/linux_64
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "... for darwin"
        cd ./lib/aeng/engines/netica/build/osx
    fi
    ./compile.sh
    cd $CDIR
    echo "Done Building Netica"

    #./service_start.sh statsd "node_modules/statsd/stats.js config.statsd.json"
    ./service_start.sh app-assessment "app-assessment.js"
}

stop() {
    #forever stop node_modules/statsd/stats.js
    forever stop app-assessment.js
}

case "$1" in
    start)
        start
        exit 0
    ;;
    stop)
        stop
        exit 0
    ;;
    restart)
        # start will kill old processes
        stop
        start
        exit 0
    ;;
    **)
        echo "Usage: $0 {start|stop|restart}" 1>&2
        exit 1
    ;;
esac
