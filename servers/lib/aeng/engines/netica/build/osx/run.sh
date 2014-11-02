#!/bin/bash

# Navigate to the location of the class file
cd ../../classes

# Run the program with the necessary jar files
# Parameter 1: name of the program to run
# Parameter 2: name of the bayes file to interpret
# Parameter 3: evidence fragment
# Parameter 4: evidence fragment
# java -cp .:../lib/linux/32/NeticaJ.jar -Djava.library.path=../lib/linux/32 $@

# Run the program with the necessary jar files
# Parameter 1: XML Bayes File Length
# Parameter 2: -> rootNode
# Parameter 3: -> evidenceFragment
# Parameter 4: -> evidenceValue
# ...
# Parameter n: -> evidenceFragment
# Parameter n+1: -> evidenceValue
#
# standard in -> XML Bayes File
java -cp .:../lib/osx/NeticaJ.jar -Djava.library.path=../lib/osx $@

# Test Run:
#   ./run.sh AdvancedBayes ../games/SC/bayes/sierra_madre.xml category_systems_thinking category_end_state 0 category_process 0
# Output: 
#   [ 0.9523355576739752, 0.014299332697807435, 0.033365109628217364 ]

# Test Run:
#	./run.sh AdvancedBayes ../games/PVZ/bayes/pvz_1.neta problem_solving sunflower_close_to_home 0 collect_falling_sun 0 plant_sunflowers_before_wave 0 plant_layout 0 potato_mines_successful 0 new_plant_layout 0 new_plant_sequence 0 replaced_plants 0
# Output:
#	[ 0.00862243978083787, 0.09312888583718708, 0.8982486743819751 ]