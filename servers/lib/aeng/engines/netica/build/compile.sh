#!/bin/bash

# Compile the java programs and store the .class files in ../classes
javac -cp ../lib/old/NeticaJ.jar ../src/SimpleBayes.java -d ../classes
javac -cp ../lib/old/NeticaJ.jar ../src/AdvancedBayes.java -d ../classes