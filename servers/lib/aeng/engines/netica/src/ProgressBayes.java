/**
 * Netica library import.
 */
import norsys.netica.*;

/**
 * Java util imports
 */
import java.util.Map;
import java.util.Arrays;

/**
 * Java I/O imports.
 */
import java.io.IOException;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;

/**
 * Apache Base64 codec
 */
import org.apache.commons.codec.binary.Base64;


/**
 * ProgressBayes class will create a student model bayes net from a .neta file
 * for use with the NeticaJ API. The student model will contain evidence fragments
 * that can be set to adjust the distributions of the other nodes. The probability
 * distribution of the root node is saved in the output.
 *
 * This class is also unique in that it pulls in binary data describing an existing
 * student model so it can be continually updated.
 *
 * Command Line Example...
 * Script: ./run.sh [BayesProgram]
 * 0.  [.neta File Location]
 * 1.  [Root Node]
 * 2.  [Number of Facets]
 * 3.  [Facet 1]
 * 4.  [Facet 2]
 * 5.  [Facet 3]
 * 6.  [Facet N]
 * 7.  [Student Model Exists]
 * 8.  [Student Model Binary]
 * 9.  [Indicator 1] [Indicator 1 Value]
 * 10.  [Indicator 2] [Indicator 2 Value]
 * 11.  [Indicator 3] [Indicator 3 Value]
 * 12.  [Indicator N] [Indicator N Value]
 *
 * Examples...
 * ./run.sh ProgressBayes ../games/PVZ/bayes/W1D1.neta ProblemSolvingSkills 4 AnalyzeGivensConstraints Planning EvaluateProgress ToolUse false 0 I3 0 I7 1 I8 0 I21 1 I17 0 I33 1 I43 0 I45 1 I46 0
 *
 * ./run.sh ProgressBayes ../games/PVZ/bayes/W1D2.neta ProblemSolvingSkills 4 AnalyzeGivensConstraints Planning EvaluateProgress ToolUse true 0 I3 1 I7 0 I8 1 I21 0 I17 1 I12_26 0 I33 1 I43 0 I45 1 I46 0
 * ./run.sh ProgressBayes ../games/PVZ/bayes/W1D3.neta ProblemSolvingSkills 4 AnalyzeGivensConstraints Planning EvaluateProgress ToolUse true 0 I3 1 I7 0 I8 1 I21 0 I17 1 I12_26 0 I33 1 I43 0 I45 1 I46 0
 * ./run.sh ProgressBayes ../games/PVZ/bayes/W1D4.neta ProblemSolvingSkills 4 AnalyzeGivensConstraints Planning EvaluateProgress ToolUse true 0 I3 1 I7 0 I8 1 I21 0 I17 1 I12_26 0 I33 1 I43 0 I45 1 I46 0
 * ./run.sh ProgressBayes ../games/PVZ/bayes/W1D6.neta ProblemSolvingSkills 4 AnalyzeGivensConstraints Planning EvaluateProgress ToolUse true 0 I3 1 I7 0 I8 1 I21 0 I17 1 I12_26 0 I33 1 I43 0 I45 1 I46 0
 *
 * ./run.sh ProgressBayes ../games/PVZ/bayes/W1D2.neta ProblemSolvingSkills 4 AnalyzeGivensConstraints Planning EvaluateProgress ToolUse true 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 I3 1 I7 0 I8 1 I21 0 I17 1 I12_26 0 I33 1 I43 0 I45 1 I46 0
 * ./run.sh ProgressBayes ../games/PVZ/bayes/W1D3.neta ProblemSolvingSkills 4 AnalyzeGivensConstraints Planning EvaluateProgress ToolUse true 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 I3 1 I7 0 I8 1 I21 0 I17 1 I12_26 0 I33 1 I43 0 I45 1 I46 0
 * ... continued I3 1 I7 0 I8 1 I21 0 I17 1 I12_26 0 I33 1 I43 0 I45 1 I46 0
 */
public class ProgressBayes {

  	public static void main( String[] args ) {
		try {
			System.out.println( "" );

			// Create the background environment
			Environ env = new Environ( null );

			// Set the student model and evidence model
			Net studentModel;
			Net evidenceModel = null;
			// Set the root node
			Node rootNode;
			// Set the number of facets and keep an array of them
			int numberOfFacets = Integer.parseInt( args[ 2 ] );
			int facetOffset = 1 + numberOfFacets;
			// Keep an array of indicator nodes so we know which to absorb
			NodeList indicatorNodes;


			// If the previous level exists, get the binary data that describes it and load it in
			boolean hadPreviousLevel = Boolean.parseBoolean( args[ 2 + facetOffset ] );
			System.out.println( "hadPreviousLevel = " + hadPreviousLevel );
			if( hadPreviousLevel ) {
				System.out.println( "\nStarting previous level logic...\n" );
				byte[] b = Base64.decodeBase64( args[ 3 + facetOffset ] );

				System.out.println( "binary arg: " + args[ 3 + facetOffset ] );
				System.out.println( "binary: " + b );

				// Load in the net for the student model and compile it
				ByteArrayInputStream bais = new ByteArrayInputStream( b );
				bais.close();
				studentModel = new Net( new Streamer( bais, "W1D1.neta", env ) );
				studentModel.compile();

				System.out.println( "Student model: " + studentModel.getName() );
				NodeList studentModelNodes = studentModel.getNodes();
				for( int i = 0; i < studentModelNodes.size(); i++ ) {
					Node node = (Node)studentModelNodes.get( i );
					System.out.println( "SM_node: " + node.getName() );
				}

				// Get the root node from the existing student model
				rootNode = studentModel.getNode( args[ 1 ] );

				System.out.println( "SM_root_node: " + rootNode.getName() );
				printBeliefsForNode( rootNode );


				// Create the evidence model net from the current level
				evidenceModel = new Net( new Streamer( args[ 0 ] ) );
				evidenceModel.compile();

				System.out.println( "Evidence model: " + evidenceModel.getName() );
				NodeList evidenceModelNodes = evidenceModel.getNodes();
				for( int i = 0; i < evidenceModelNodes.size(); i++ ) {
					Node node = (Node)evidenceModelNodes.get( i );
					System.out.println( "EM_node: " + node.getName() );
				}

				System.out.println( "\nGet the indicators and copy the nodes...\n" );

				// Create the indicator nodes list and add the indicators to it
				// Indicators could come from an evidence model (if the player had
				// completed earlier levels) or the student model (if the player is
				// on the first level)
				indicatorNodes = new NodeList( evidenceModel );
				for( int i = 4 + facetOffset; i < args.length; i += 2 ) {
					indicatorNodes.add( evidenceModel.getNode( args[ i ] ) );
					System.out.println( "Added indicator node: " + evidenceModel.getNode( args[ i ] ).getName() );
				}

				// Copy the indicator nodes from the previous net to the new net
				NodeList copiedNodes = studentModel.copyNodes( indicatorNodes );
				System.out.println( "\nNumber of nodes to copy: " + copiedNodes.size() );
				
				// Re-parent the nodes properly
				for( int i = 0; i < copiedNodes.size(); i++ ) {
					// Set the nodes we intend to access/edit
					Node oldNode = (Node)indicatorNodes.get( i );
					Node newNode = (Node)copiedNodes.get( i );

					System.out.println( "\nCopying... " + i + ", old node: " + oldNode.getName() + ", new node: " + newNode.getName() );

					//System.out.println( "Number of parents before adding links: " + newNode.getParents().size() );

					// The parents of the old node from the old net becomes of the parents of the 
					// new node from the new net (nodes should share the same name)
					NodeList oldParents = oldNode.getParents();
					int numOldParents = oldParents.size();
					for( int j = 0; j < numOldParents; j++ ) {
						Node oldParent = (Node)oldParents.get( j );
						Node newParent = studentModel.getNode( oldParent.getName() );
						//int addedLink = newNode.addLink( newParent );
						newNode.switchParent( j, newParent );

						System.out.println( "Linking... " + j + ", old parent: " + oldParent.getName() + ", new parent: " + newParent.getName() );// + ", link index: " + addedLink );
					}

					// Remove all of the old parents
					for( int j = 0; j < numOldParents; j++ ) {
						//newNode.deleteLink( 0 );
					}

					//printCPTsForNode( newNode );

					//System.out.println( "Number of parents after adding links: " + newNode.getParents().size() );
				}

				// The indicatorNodes collection must be the copiedNodes collection now,
				// since those are the new nodes we should absorb
				indicatorNodes = copiedNodes;
				for( int i = 0; i < indicatorNodes.size(); i++ ) {
					Node node = (Node)indicatorNodes.get( i );
					System.out.println( "SM_indicator_node: " + node.getName() );
				}

				studentModel.compile();
			}
			// No level exists, this must be the first level
			else {
				// Create the student model
				studentModel = new Net( new Streamer( args[ 0 ] ) );
				studentModel.compile();

				// Get the root node from the evidence model
				rootNode = studentModel.getNode( args[ 1 ] );

				// Get the indicator nodes
				indicatorNodes = new NodeList( studentModel );
				for( int i = 4 + facetOffset; i < args.length; i += 2 ) {
					indicatorNodes.add( studentModel.getNode( args[ i ] ) );
				}
			}

			//printBeliefsForNode( rootNode );

			System.out.println( "\nEnter findings...\n" );


			// Read the evidence fragments that we need to set as findings
			for( int i = 4 + facetOffset; i < args.length; i += 2 ) {
				// Get the fragment name, finding, and node
				String fragmentName = args[ i ];
				int finding = Integer.parseInt( args[ i + 1 ] );
				Node node = studentModel.getNode( fragmentName );

				System.out.println( "Entering finding for " + node.getName() + " with value " + finding );

				// Set the finding for the node
				if( finding != -1 ) {
					node.finding().enterState( finding );
				}
			}

			System.out.println( "\nAbsorb nodes...\n" );

			// Absorb each evidence fragment so the output net contains only nodes
			// necessary for the student model
			studentModel.absorbNodes( indicatorNodes );
			studentModel.compile();


			// Print the final distributions for the root and facets
			NodeList studentModelNodes = studentModel.getNodes();
			for( int i = 0; i < studentModelNodes.size(); i++ ) {
				Node node = (Node)studentModelNodes.get( i );
				printBeliefsForNodeClean( node );
			}


			System.out.println( "\nWrite findings to file...\n" );

			/*
			 * Save the net now that findings have been set.
			 * The byte array of baos contains the net serialized in the standard .dne/.dnet format.
			 */
			ByteArrayOutputStream baos = new ByteArrayOutputStream();
			Streamer stream = new Streamer( baos, "W1D1.neta", env );
			studentModel.write( stream );
			stream.flush();
			stream.close();

			/*
			 * Begin constructing the JSON output
			 */

			System.out.println( "\nGenerate output...\n" );

			// Opening
			System.out.println( "{" );

			// Once the findings have been set, get the probability distribution for the root node.
			System.out.println( "\"bayesResults\":{\"" + rootNode.getName() + "\":" );
			printBeliefsForNode( rootNode );
			for( int i = 0; i < numberOfFacets; i++ ) {
				System.out.print( ",\"" + args[ 3 + i ] + "\":" );
				printBeliefsForNode( studentModel.getNode( args[ 3 + i ] ) );
			}
			System.out.print( "}" );

			// Print the encoded binary for the results
			String encoded = Base64.encodeBase64String( baos.toByteArray() );
			System.out.println( ",\"modelBinary\":\"" + encoded + "\"" );

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

  	public static void printBeliefsForNodeClean( Node node ) {
  		try {
  			float[] beliefs = node.getBeliefs();
	  		System.out.print( "[ " );
	        for( int i = 0; i < beliefs.length; i++ ) {
	            System.out.print( beliefs[ i ] );
	            if( i + 1 < beliefs.length ) {
	                System.out.print( ", " );
	            }
	        }
	        System.out.println( " ] " + node.getName() );
  		}
  		catch( Exception e ) {
  			e.printStackTrace();
  		}
  	}

  	public static void printCPTsForNode( Node node ) {
  		try {
  			float[] cpts = node.getCPTable( null );
	  		System.out.print( "CPT for " + node.getName() + ": [" );
	        for( int i = 0; i < cpts.length; i++ ) {
	            System.out.print( cpts[ i ] );
	            if( i + 1 < cpts.length ) {
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