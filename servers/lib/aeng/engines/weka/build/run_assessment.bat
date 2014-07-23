@echo off

REM Navigate to the location of the class file
cd ../classes

REM Run the program with the necessary jar files
REM Parameter 1: name of the program to run
REM Parameter 2: name of the bayes file to interpret
REM Parameter 3: evidence fragment
REM Parameter 4: evidence fragment
java -cp .;../lib/couchbase-client-1.3.2.jar;../lib/spymemcached-2.10.5.jar;../lib/weka.jar;../lib/gson-2.2.4.jar;../lib/httpcore-4.3.jar;../lib/httpcore-nio-4.3.jar;../lib/jettison-1.1.jar;../lib/commons-codec-1.5.jar;../lib/netty-3.5.5.Final.jar %1 %2 %3 %4