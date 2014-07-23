#!/bin/bash

# Navigate to the location of the class file
cd ../classes

# Run the program with the necessary jar files
# Parameter 1: name of the program to run
# Parameter 2: name of the bayes file to interpret
# Parameter 3: evidence fragment
# Parameter 4: evidence fragment
# java -cp .:../lib/couchbase-client-1.3.2.jar:../lib/spymemcached-2.10.5.jar:../lib/weka.jar:../lib/gson-2.2.4.jar:../lib/httpcore-4.3.jar:../lib/httpcore-nio-4.3.jar:../lib/jettison-1.1.jar:../lib/commons-codec-1.5.jar:../lib/netty-3.5.5.Final.jar $1 $2 $3 $4

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
java -cp .:../lib/weka.jar $@

# Test Run:
#   ./run_assessment.sh SimpleBayes 3349 category_sys_mod category_end_state 4 category_remove_replace 0 < ../bayes/sierra_madre.xml
# Output: 
#   [ 0.31, 0.34, 0.28, 0.0699999999999999, 0.0]
