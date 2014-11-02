#!/bin/bash

# Compile the java programs and store the .class files in ../classes
javac -target 1.6 -cp ../../lib/linux_32/NeticaJ.jar ../../src/SimpleBayes.java -d ../../classes
javac -target 1.6 -cp ../../lib/linux_32/NeticaJ.jar ../../src/AdvancedBayes.java -d ../../classes