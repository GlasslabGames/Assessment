@echo off

REM Compile the java programs and store the .class files in ../classes
javac -cp ../lib/couchbase-client-1.3.2.jar;../lib/spymemcached-2.10.5.jar;../lib/weka.jar;../lib/gson-2.2.4.jar ../src/SimpleBayes.java -d ../classes