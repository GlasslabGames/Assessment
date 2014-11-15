/**
 * Netica library import.
 */
import norsys.netica.*;

/**
 * Java I/O imports.
 */
/*import java.io.IOException;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.StringBufferInputStream;*/


/**
 * SimpleBayes class will perform bayes net operations with incoming data and
 * produce results in the form of a probability distribution. This simple
 * utilization of the Bayes' Net involves pulling a bayes model from the data
 * store (in Couchbase) and setting findings in the child nodes of this model.
 * A liklihook distribution is extracted from each node of the model and stored
 * in the database.
 *
 * args[ 0 ] -> .neta Bayes File Length
 * args[ 1 ] -> rootNode
 * args[ 2 ] -> evidenceFragment
 * args[ 3 ] -> evidenceValue
 * ...
 * args[ n   ] -> evidenceFragment
 * args[ n+1 ] -> evidenceValue
 *
 * standard in -> .neta Bayes File
 */
public class SimpleBayes {

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
	        StringBufferInputStream sbis = new StringBufferInputStream( bayesFileData );*/

			// Create the Net using the .dne file and compile it
			Net net = new Net( new Streamer( args[ 0 ] ) );
			net.compile();

			// Read the evidence fragments that we need to capture.
			// These fragments should be parameters in the command line
			for( int i = 2; i < args.length; i += 2 ) {
				String evidenceFragment = args[i];
				int finding = Integer.parseInt( args[ i + 1 ] );
				net.getNode( evidenceFragment ).finding().enterState( finding );
			}

			// Once the findings have been set, get the probability distribution for
			// the root node.
			printBeliefs( net.getNode( args[ 1 ] ) );

			/*// Get the nodes
			Node node_ProblemSolving = net.getNode( "category_systems_thinking" );
			Node node_ToolUsage = net.getNode( "category_end_state" );

			//float[] likelihood = new float[]{ 0.13636364f, 0.7272727f, 0.13636364f };
			//node_ProblemSolving.finding().enterLikelihood( likelihood );

			// Get a sample belief set
			printBeliefs( node_ProblemSolving );

			// Enter finding
			node_ToolUsage.finding().enterState( "P1" );
			printBeliefs( node_ProblemSolving );*/
		}
		catch( Exception e ) {
			e.printStackTrace();
		}
  	}

  	public static void printBeliefs( Node node ) {
  		try {
  			float[] beliefs = node.getBeliefs();
	  		//System.out.print( node.getName() + ": [ " );
	  		System.out.print( "[ " );
	        for( int i = 0; i < beliefs.length; i++ ) {
	            System.out.print( beliefs[ i ] );
	            if( i + 1 < beliefs.length ) {
	                System.out.print( ", " );
	            }
	        }
	        System.out.println( " ]" );
  		}
  		catch( Exception e ) {
  			e.printStackTrace();
  		}
  	}
}