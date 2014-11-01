/**
 * Netica library import.
 */
import norsys.netica.*;

/**
 * Java util imports
 */
import java.util.Map;

/**
 * Java I/O imports.
 */
import java.io.IOException;
import java.io.BufferedReader;
import java.io.InputStreamReader;
//import java.io.StringBufferInputStream;


/**
 * AdvancedBayes class will perform bayes net operations with incoming data and
 * produce results in the form of a probability distribution. This simple
 * utilization of the Bayes' Net involves pulling a bayes model from the data
 * store (in Couchbase) and setting findings in the child nodes of this model.
 * A liklihook distribution is extracted from each node of the model and stored
 * in the database.
 *
 * Command Line Example...
 * Script: ./run.sh [BayesProgram]
 * 0.  [.neta File Location]
 * 1.  [Root Node]
 * 2.  [Posterior Count]
 * 3.  [p1] [p1v1] [p1v2] [p1v3] [p1vN]
 * 4.  [p2] [p2v1] [p2v2] [p2v3] [p2vN]
 * 5.  [pN] [pNv1] [pNv2] [pNv3] [pNvN]
 * 6.  [Indicator 1] [Indicator 1 Value]
 * 7.  [Indicator 2] [Indicator 2 Value]
 * 8.  [Indicator 3] [Indicator 3 Value]
 * 9.  [Indicator N] [Indicator N Value]
 */
public class AdvancedBayes {

  	public static void main( String[] args ) {
		try {
			// Create the background environment
			Environ env = new Environ( null );

			/*// Read .neta from standard in
			Integer bayesFileLength = Integer.parseInt( args[0] );
	        BufferedReader br = new BufferedReader( new InputStreamReader( System.in ) );
	        String bayesFileData = "", line;
	        while( ( ( line = br.readLine() ) != null ) &&
	                bayesFileData.length() < bayesFileLength
	             ){
	                bayesFileData += line;
	        }
	        
	        // Create the string buffer input stream
	        //StringBufferInputStream sbis = new StringBufferInputStream( bayesFileData );
	        String dneString = "// ~->[DNET-1]->~\nbnet test{};";
 			StringBufferInputStream sbis = new StringBufferInputStream (dneString);*/

			// Create the Net using the .dne file and compile it
			//Net net = new Net( new Streamer( sbis, "../games/SC/bayes/worker_shortage.neta", env ) );
			Net net = new Net( new Streamer( args[ 0 ] ) );
			net.compile();

			// Get the root node
			Node rootNode = net.getNode( args[ 1 ] );

			// Get the posterior count (the number of nodes we need to save output from)
			int posteriorCount = Integer.parseInt( args[ 2 ] );
			String[] posteriors = new String[ posteriorCount ];

			// Begin iterating through the posteriors to set the new priors
			int currentArgument = 3;
			for( int i = 0; i < posteriorCount; i++ ) {
				// Get the node for this posterior and the number of states
				Node node = net.getNode( args[ currentArgument++ ] );
				int numStates = node.getNumStates();

				// Store this posterior since we'll be setting it as part of the output
				posteriors[ i ] = node.getName();

				// If the first value is -1, then we know there is no likelihood set
				// We'll have to break from here
				float firstValue = Float.parseFloat( args[ currentArgument ] );
				if( firstValue == -1 ) {
					currentArgument++;
					continue;
				}

				// Iterate through the number of states and get each value of the prior likelihood distribution
				float[] likelihood = new float[ numStates ];
				likelihood[ 0 ] = firstValue;
				for( int j = 1; j < numStates; j++ ) {
					likelihood[ j ] = Float.parseFloat( args[ currentArgument + j ] );
				}

				// Set the likelihood for this node
				// This has taken the posteriors from the previous bayes net and setting them
				// as the priors for this current bayes net.
				node.finding().enterLikelihood( likelihood );

				// Update the currentArgument index
				currentArgument += numStates;
			}

			// Read the evidence fragments that we need to set as findings
			for( int i = currentArgument; i < args.length; i += 2 ) {
				// Get the fragment and finding
				String evidenceFragment = args[ i ];
				int finding = Integer.parseInt( args[ i + 1 ] );

				// Set the finding for the fragment
				net.getNode( evidenceFragment ).finding().enterState( finding );
			}

			/*
			 * Begin constructing the JSON output
			 */

			// Opening
			System.out.println( "{" );

			// Iterate through the posteriors array and print each belief
			System.out.println( "\"posteriors\":{" );
			for( int i = 0; i < posteriorCount; i++ ) {
				System.out.println( "\"" + posteriors[ i ] + "\":" );
				printBeliefsForNode( net.getNode( posteriors[ i ] ) );
				if( i + 1 < posteriorCount ) {
	                System.out.println( "," );
	            }
			}
			System.out.println( "}," );

			// Once the findings have been set, get the probability distribution for the root node.
			System.out.println( "\"bayesResults\":" );
			printBeliefsForNode( rootNode );

			// Closing
			System.out.println( "}" );
		}
		catch( Exception e ) {
			e.printStackTrace();
		}
  	}

  	public static void printBeliefsForNode( Node node ) {
  		try {
  			float[] beliefs = node.getBeliefs();
	  		System.out.print( "[" );
	        for( int i = 0; i < beliefs.length; i++ ) {
	            System.out.print( beliefs[ i ] );
	            if( i + 1 < beliefs.length ) {
	                System.out.print( "," );
	            }
	        }
	        System.out.println( "]" );
  		}
  		catch( Exception e ) {
  			e.printStackTrace();
  		}
  	}
}