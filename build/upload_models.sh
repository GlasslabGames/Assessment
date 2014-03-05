#!/bin/bash

# Navigate to the location of the class file
cd ../classes

# Run the program with the necessary jar files
java -cp .:../lib/couchbase-client-1.3.2.jar:../lib/spymemcached-2.10.5.jar:../lib/weka.jar:../lib/gson-2.2.4.jar:../lib/httpcore-4.3.jar:../lib/httpcore-nio-4.3.jar:../lib/jettison-1.1.jar:../lib/commons-codec-1.5.jar:../lib/netty-3.5.5.Final.jar UploadBayesDocument

# Navigate to the build directory
cd ../build