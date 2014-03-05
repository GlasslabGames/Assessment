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
 * SimpleBayes class will perform bayes net operations with incoming data and
 * produce results in the form of a probability distribution. This simple
 * utilization of the Bayes' Net involves pulling a bayes model from the 
 * data store (in Couchbase) and setting evidence values in the child nodes
 * of this model. A liklihook distribution is extracted from the root node
 * of the model and stored in the database.
 */
public class UploadBayesDocument
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

        // HARDCODED: upload the bayes documents
        // TODO: remove this from here
        JsonObject sierra_madre_bayes = new JsonObject();
        sierra_madre_bayes.add( "bayesFile", new JsonPrimitive( "<?xml version=\"1.0\"?><!-- DTD for the XMLBIF 0.3 format --><!DOCTYPE BIF [<!ELEMENT BIF ( NETWORK )*><!ATTLIST BIF VERSION CDATA #REQUIRED><!ELEMENT NETWORK ( NAME, ( PROPERTY | VARIABLE | DEFINITION )* )><!ELEMENT NAME (#PCDATA)><!ELEMENT VARIABLE ( NAME, ( OUTCOME |  PROPERTY )* ) ><!ATTLIST VARIABLE TYPE (nature|decision|utility) \"nature\"><!ELEMENT OUTCOME (#PCDATA)><!ELEMENT DEFINITION ( FOR | GIVEN | TABLE | PROPERTY )* ><!ELEMENT FOR (#PCDATA)><!ELEMENT GIVEN (#PCDATA)><!ELEMENT TABLE (#PCDATA)><!ELEMENT PROPERTY (#PCDATA)>]><BIF VERSION=\"0.3\"><NETWORK><NAME>New Network</NAME><VARIABLE TYPE=\"nature\"><NAME>category_sys_mod</NAME><OUTCOME>Value1</OUTCOME><OUTCOME>Value2</OUTCOME><OUTCOME>Value3</OUTCOME><OUTCOME>Value4</OUTCOME><OUTCOME>Value5</OUTCOME><PROPERTY>position = (287,107)</PROPERTY></VARIABLE><VARIABLE TYPE=\"nature\"><NAME>category_remove_replace</NAME><OUTCOME>R1</OUTCOME><OUTCOME>R2</OUTCOME><OUTCOME>R3</OUTCOME><OUTCOME>R4</OUTCOME><OUTCOME>R5</OUTCOME><OUTCOME>R6</OUTCOME><PROPERTY>position = (143,269)</PROPERTY></VARIABLE><VARIABLE TYPE=\"nature\"><NAME>category_end_state</NAME><OUTCOME>P1</OUTCOME><OUTCOME>P2</OUTCOME><OUTCOME>P3</OUTCOME><OUTCOME>P4</OUTCOME><OUTCOME>P5</OUTCOME><OUTCOME>P6</OUTCOME><PROPERTY>position = (418,273)</PROPERTY></VARIABLE><DEFINITION><FOR>category_sys_mod</FOR><GIVEN>category_remove_replace</GIVEN><GIVEN>category_end_state</GIVEN><TABLE>0.77 0.22 0.010000000000000064 0.0 0.0 0.58 0.4 0.01 0.010000000000000009 0.0 0.57 0.37999999999999995 0.04 0.009999999999999926 0.0 0.34 0.53 0.11 0.01999999999999999 0.0 0.31 0.34 0.28 0.0699999999999999 0.0 0.24 0.37 0.28 0.09 0.02000000000000001 0.57 0.42 0.01 0.0 0.0 0.35 0.63 0.02 0.0 0.0 0.35 0.6 0.04 0.01 0.0 0.17 0.69 0.11 0.02 0.010000000000000009 0.16 0.47 0.3 0.07 0.0 0.12 0.49 0.29 0.08 0.02000000000000013 0.6 0.34 0.05 0.010000000000000009 0.0 0.38 0.53 0.09 0.0 0.0 0.33 0.44 0.21 0.01 0.010000000000000009 0.13 0.41 0.41 0.02 0.030000000000000027 0.08 0.17 0.69 0.02 0.040000000000000036 0.06 0.17 0.65 0.02 0.09999999999999998 0.4700000000000001 0.3100000000000001 0.17000000000000007 0.040000000000000015 0.00999999999999979 0.26 0.42 0.25 0.06 0.010000000000000009 0.17 0.27 0.46 0.09 0.009999999999999898 0.05 0.17 0.6 0.15 0.029999999999999916 0.02 0.05 0.71 0.17 0.05 0.01 0.05 0.64 0.2 0.09999999999999987 0.42 0.34 0.16 0.06 0.020000000000000018 0.22 0.45 0.22 0.08 0.030000000000000027 0.15 0.29 0.4 0.14 0.020000000000000018 0.04 0.17 0.5 0.2 0.09000000000000014 0.02 0.05 0.6 0.24 0.09000000000000008 0.01 0.05 0.51 0.26 0.16999999999999993 0.23 0.32 0.24 0.14 0.0699999999999999 0.11 0.36 0.28 0.16 0.08999999999999991 0.06 0.2 0.44 0.23 0.07000000000000012 0.01 0.1 0.45 0.28 0.15999999999999998 0.0 0.03 0.5 0.31 0.15999999999999992 0.0 0.02 0.39 0.31 0.28 </TABLE></DEFINITION><DEFINITION><FOR>category_remove_replace</FOR><TABLE>0.16666666666666669 0.16666666666666669 0.16666666666666669 0.16666666666666669 0.16666666666666669 0.16666666666666669 </TABLE></DEFINITION><DEFINITION><FOR>category_end_state</FOR><TABLE>0.16666666666666669 0.16666666666666669 0.16666666666666669 0.16666666666666669 0.16666666666666669 0.16666666666666669 </TABLE></DEFINITION></NETWORK></BIF>" ) );
        sierra_madre_bayes.add( "root", new JsonPrimitive( "category_sys_mod" ) );
        JsonArray sierra_madre_fragmentsArray = new JsonArray();
        sierra_madre_fragmentsArray.add( new JsonPrimitive( "category_end_state" ) );
        sierra_madre_fragmentsArray.add( new JsonPrimitive( "category_remove_replace" ) );
        sierra_madre_bayes.add( "fragments", sierra_madre_fragmentsArray );
        client.set( "sierra_madre", sierra_madre_bayes.toString() ).get();

        JsonObject jackson_city_bayes = new JsonObject();
        jackson_city_bayes.add( "bayesFile", new JsonPrimitive( "<?xml version=\"1.0\"?><!-- DTD for the XMLBIF 0.3 format --><!DOCTYPE BIF [<!ELEMENT BIF ( NETWORK )*><!ATTLIST BIF VERSION CDATA #REQUIRED><!ELEMENT NETWORK ( NAME, ( PROPERTY | VARIABLE | DEFINITION )* )><!ELEMENT NAME (#PCDATA)><!ELEMENT VARIABLE ( NAME, ( OUTCOME |  PROPERTY )* ) ><!ATTLIST VARIABLE TYPE (nature|decision|utility) \"nature\"><!ELEMENT OUTCOME (#PCDATA)><!ELEMENT DEFINITION ( FOR | GIVEN | TABLE | PROPERTY )* ><!ELEMENT FOR (#PCDATA)><!ELEMENT GIVEN (#PCDATA)><!ELEMENT TABLE (#PCDATA)><!ELEMENT PROPERTY (#PCDATA)>]><BIF VERSION=\"0.3\"><NETWORK><NAME>New Network</NAME><VARIABLE TYPE=\"nature\"><NAME>category_sys_mod</NAME><OUTCOME>Value1</OUTCOME><OUTCOME>Value2</OUTCOME><OUTCOME>Value3</OUTCOME><OUTCOME>Value4</OUTCOME><OUTCOME>Value5</OUTCOME><PROPERTY>position = (287,107)</PROPERTY></VARIABLE><VARIABLE TYPE=\"nature\"><NAME>category_remove_replace</NAME><OUTCOME>R1</OUTCOME><OUTCOME>R2</OUTCOME><OUTCOME>R3</OUTCOME><OUTCOME>R4</OUTCOME><OUTCOME>R5</OUTCOME><OUTCOME>R6</OUTCOME><PROPERTY>position = (143,269)</PROPERTY></VARIABLE><VARIABLE TYPE=\"nature\"><NAME>category_end_state</NAME><OUTCOME>P1</OUTCOME><OUTCOME>P2</OUTCOME><OUTCOME>P3</OUTCOME><OUTCOME>P4</OUTCOME><OUTCOME>P5</OUTCOME><PROPERTY>position = (404,269)</PROPERTY></VARIABLE><DEFINITION><FOR>category_sys_mod</FOR><GIVEN>category_remove_replace</GIVEN><GIVEN>category_end_state</GIVEN><TABLE>0.9 0.09 0.01 0.0 0.0 0.71 0.25 0.04 0.0 0.0 0.31 0.63 0.04999999999999999 0.01 0.0 0.39 0.05 0.53 0.03 0.0 0.16 0.03 0.71 0.07 0.030000000000000138 0.66 0.33 0.01 0.0 1.1102230246251565E-16 0.36 0.59 0.05 0.0 0.0 0.09 0.87 0.04 0.0 0.0 0.21 0.14 0.62 0.02 0.010000000000000009 0.08 0.07 0.7599999999999999 0.05999999999999999 0.029999999999999912 0.69 0.26 0.039999999999999994 0.01 0.0 0.35 0.43 0.2 0.02 1.1102230246251565E-16 0.1 0.68 0.19 0.03 1.1102230246251565E-16 0.06 0.03 0.8 0.08 0.03 0.02 0.01 0.74 0.15 0.08 0.59 0.29 0.11 0.01 1.1102230246251565E-16 0.23 0.37 0.35 0.03 0.020000000000000018 0.06 0.57 0.3400000000000002 0.03 0.0 0.02 0.02 0.85 0.08 0.030000000000000027 0.010000000000000002 0.010000000000000002 0.7700000000000001 0.14000000000000004 0.06999999999999985 0.57 0.32 0.07 0.03 0.01 0.23 0.42 0.23 0.08 0.040000000000000036 0.06 0.61 0.19 0.11 0.03000000000000025 0.03 0.02 0.63 0.23 0.09000000000000008 0.01 0.01 0.45 0.33 0.2 0.14 0.12 0.16 0.42 0.16 0.02 0.06 0.21 0.46 0.25 0.0 0.08 0.16 0.55 0.20999999999999996 0.0 0.0 0.24 0.51 0.25 0.0 0.0 0.12000000000000001 0.5200000000000001 0.35999999999999993 </TABLE></DEFINITION><DEFINITION><FOR>category_remove_replace</FOR><TABLE>0.16666666666666669 0.16666666666666669 0.16666666666666669 0.16666666666666669 0.16666666666666669 0.16666666666666669 </TABLE></DEFINITION><DEFINITION><FOR>category_end_state</FOR><TABLE>0.2 0.2 0.2 0.2 0.2 </TABLE></DEFINITION></NETWORK></BIF>" ) );
        jackson_city_bayes.add( "root", new JsonPrimitive( "category_sys_mod" ) );
        JsonArray jackson_city_fragmentsArray = new JsonArray();
        jackson_city_fragmentsArray.add( new JsonPrimitive( "category_end_state" ) );
        jackson_city_fragmentsArray.add( new JsonPrimitive( "category_remove_replace" ) );
        jackson_city_bayes.add( "fragments", jackson_city_fragmentsArray );
        client.set( "jackson_city", jackson_city_bayes.toString() ).get();

        // Shutdown the Couchbase connection
        client.shutdown();
    }
}