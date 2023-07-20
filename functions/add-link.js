const { MongoClient } = require('mongodb');

// Connection URL
const uri =
  'mongodb+srv://simonindelicate:flopsybunney27@cluster0.teqecpk.mongodb.net/?retryWrites=true&w=majority';

// Create a new MongoClient
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Database Name
const dbName = 'Album';

exports.handler = async (event, context) => {
  try {
    // Parse the request body to get the title, url, and description values
    const { title, url, description } = JSON.parse(event.body);

    // Use connect method to connect to the server
    await client.connect();
    console.log('Connected successfully to server');

    const db = client.db(dbName);

    // Get the collection of urls and titles
    const collection = db.collection('shortylinks');

    // Insert a new document into the collection with the title, url, and description values
    await collection.insertOne({ title, url, description });

    // Close the database connection
    await client.close();

    return {
      statusCode: 200,
      body: 'Link added successfully',
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: err.message,
    };
  }
};

