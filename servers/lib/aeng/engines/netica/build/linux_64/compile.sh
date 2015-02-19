#!/bin/bash

# Compile the java programs and store the .class files in ../classes
javac -cp ../../lib/linux_64/NeticaJ.jar ../../src/SimpleBayes.java -d ../../classes
javac -cp ../../lib/linux_64/NeticaJ.jar ../../src/AdvancedBayes.java -d ../../classes
javac -cp .:../../lib/osx/commons-codec-1.9.jar:../../lib/linux_64/NeticaJ.jar ../../src/ProgressBayes.java -d ../../classes