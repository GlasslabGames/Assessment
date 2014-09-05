#!/bin/bash

NAME=$1

if [ -n "$2" ]; then
    SCRIPT=$2
else
    SCRIPT="app-${NAME}.js"
fi

# stop then start
#forever stop ${SCRIPT}
forever start \
-a \
-l ${LOG_DIR}/${NAME}.log \
${SCRIPT}
#-o >(logger -p local0.info -t ${NAME})
#-e >(logger -p local0.error -t ${NAME})
# 2>&1 | cat > /dev/null &
