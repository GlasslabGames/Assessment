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

/**
 * Couchbase imports.
 */
import com.couchbase.client.CouchbaseClient;

/**
 * JSON parsing library imports.
 * TODO: replace the GSON library with jansson
 */
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import com.google.gson.JsonObject;
import com.google.gson.JsonArray;
import com.google.gson.JsonPrimitive;

/**
 * WEKA library and data structures imports.
 */
import weka.classifiers.bayes.net.BIFReader;
import weka.classifiers.bayes.net.EditableBayesNet;
import weka.classifiers.bayes.net.MarginCalculator;



/**
 * SimpleBayes class will perform bayes net operations with incoming data and
 * produce results in the form of a probability distribution. This simple
 * utilization of the Bayes' Net involves pulling a bayes model from the 
 * data store (in Couchbase) and setting evidence values in the child nodes
 * of this model. A liklihook distribution is extracted from the root node
 * of the model and stored in the database.
 */
public class SimpleBayes
{
    public static void main( String[] args ) throws Exception
    {
        // Set the hosts list
        URI mainURI = null;
        mainURI = new URI( "http://localhost:8091/pools" );

        List<URI> hosts = Arrays.asList(
            mainURI
        );

        // Connect to the cluster
        CouchbaseClient client = new CouchbaseClient( hosts, "glasslab_assessment", "Administrator", "glasslab" );

        // Retrieve the WEKA document by passing in the name of the couchbase document from the URL
        String documentToRetrieve = args[ 0 ];
        String dataFile = (String)client.get( documentToRetrieve );

        // Shutdown the couchbase connection
        client.shutdown();

        // Parse the JSON object
        JsonObject jObject = (JsonObject)new JsonParser().parse( dataFile );

        // Process the XML bayes string
        BIFReader stringReader = new BIFReader();
        stringReader.processString( jObject.get( "bayesFile" ).getAsString() );


        // Read the Bayes net from the file
        EditableBayesNet bayesNet = new EditableBayesNet( stringReader );

        // Instantiate the margin calculator (this will compute the distribution of each node)
        MarginCalculator  marginCalculator = new MarginCalculator();
        marginCalculator.calcMargins( bayesNet );

        // Read the evidence fragments that we need to capture
        // These evidence fragments should be parameters in the URL
        JsonArray jArray = (JsonArray)jObject.get( "fragments" );
        for( int i = 0; i < jArray.size(); i++ ) {
            String evidenceFragment = jArray.get( i ).getAsString();
            int evidenceValue = Integer.parseInt( args[ i + 1 ] );
            marginCalculator.setEvidence( marginCalculator.getNode( evidenceFragment ), evidenceValue );
        }

        // Once the evidence values have been set, get the probability distribution for the root node
        String rootNode = jObject.get( "root" ).getAsString();
        double[] margin = marginCalculator.getMargin( marginCalculator.getNode( rootNode ) );

        // Setup the JSON object to return with probability information
        JsonObject distJObject =  new JsonObject();
        JsonPrimitive bayesKeyObject = new JsonPrimitive( documentToRetrieve );
        distJObject.add( "bayesKey", bayesKeyObject );
        JsonArray marginArray = new JsonArray();
        for( int j = 0; j < margin.length; j++ ) {
            marginArray.add( new JsonPrimitive( margin[j] ) );
        }
        distJObject.add( "dist", marginArray );


        // DEBUG: print the results
        System.out.println( distJObject.toString() );
    }
}