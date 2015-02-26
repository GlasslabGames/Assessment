#!/bin/bash

# Compile the java programs and store the .class files in ../classes
# Use -Xlint:all for verbose warnings and errors
javac -cp ../../lib/osx/NeticaJ.jar ../../src/SimpleBayes.java -d ../../classes
javac -cp ../../lib/osx/NeticaJ.jar ../../src/AdvancedBayes.java -d ../../classes
javac -cp .:../../lib/osx/commons-codec-1.9.jar:../../lib/osx/NeticaJ.jar ../../src/ProgressBayes.java -d ../../classes -Xlint