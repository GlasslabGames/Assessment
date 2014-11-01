/**
 * Java data structures imports.
 */
import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.ArrayList;
import java.util.Iterator;

/**
 * Java I/O imports.
 */
import java.io.IOException;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.InputStreamReader;

/**
 * WEKA library and data structures imports.
 */
import weka.classifiers.bayes.net.BIFReader;
import weka.classifiers.bayes.net.EditableBayesNet;
import weka.classifiers.bayes.net.MarginCalculator;
import weka.core.converters.ConverterUtils.DataSource;
import weka.core.Instances;
import weka.classifiers.Classifier;
import weka.classifiers.Evaluation;


/**
 * SimpleBayes class will perform bayes net operations with incoming data and
 * produce results in the form of a probability distribution. This simple
 * utilization of the Bayes' Net involves pulling a bayes model from the 
 * data store (in Couchbase) and setting evidence values in the child nodes
 * of this model. A liklihook distribution is extracted from the root node
 * of the model and stored in the database.
 *
 * args[ 0 ] -> XML Bayes File Length
 * args[ 1 ] -> rootNode
 * args[ 2 ] -> evidenceFragment
 * args[ 3 ] -> evidenceValue
 * ...
 * args[ n   ] -> evidenceFragment
 * args[ n+1 ] -> evidenceValue
 *
 * standard in -> XML Bayes File
 */
public class SimpleBayes
{
    public static void main( String[] args ) throws Exception
    {
        Integer bayesFileLength = Integer.parseInt( args[0] );

        // read xml from standard in
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String bayesFileData = "", line;
 
        while( ((line = br.readLine()) != null) &&
                bayesFileData.length() < bayesFileLength
             ){
                bayesFileData += line;
        }

        // Process the XML bayes string
        BIFReader stringReader = new BIFReader();
        stringReader.processString( bayesFileData );

        // Read the Bayes net from the file
        EditableBayesNet bayesNet = new EditableBayesNet( stringReader );
        

        // Instantiate the margin calculator (this will compute the distribution of each node)
        MarginCalculator  marginCalculator = new MarginCalculator();
        marginCalculator.calcMargins( bayesNet );

        // Read the evidence fragments that we need to capture
        // These evidence fragments should be parameters in the URL
        for( int i = 2; i < args.length; i += 2 ) {
            String evidenceFragment = args[i];
            int evidenceValue = Integer.parseInt( args[ i + 1 ] );
            marginCalculator.setEvidence( marginCalculator.getNode( evidenceFragment ), evidenceValue );
        }

        //System.out.println( "----------" );
        

        // Once the evidence values have been set, get the probability distribution for the root node
        //String rootNode = jObject.get( "root" ).getAsString();
        String rootNode = args[1];
        double[] margin = marginCalculator.getMargin( marginCalculator.getNode( rootNode ) );

        // Read the evidence fragments that we need to capture
        // These evidence fragments should be parameters in the URL
        for( int i = 0; i < bayesNet.getNrOfNodes(); i++ ) {
            printMargin( bayesNet.getNodeName( i ), marginCalculator.getMargin( i ) );
        }


        //System.out.println( "----------" );
    }

    public static void printMargin( String node, double[] margin )
    {
        System.out.print( node + ": [ " );
        for( int i = 0; i < margin.length; i++ ) {
            System.out.print( margin[i] );
            if(i+1 < margin.length) {
                System.out.print( ", " );
            }
        }
        System.out.println( " ]" );
    }
}