const { MongoClient } = require('mongodb');
const http = require('http');
const https = require('https');
const { parseDOM } = require('htmlparser2');
const domutils = require('domutils');

// Connection URL
const uri =
  'mongodb+srv://simonindelicate:flopsybunney27@cluster0.teqecpk.mongodb.net/?retryWrites=true&w=majority';

// Create a new MongoClient
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Database Name
const dbName = 'Album';

exports.handler = async (event, context) => {
  try {
    // Get the skip value from the request query string
    const skip = event.queryStringParameters.skip ? parseInt(event.queryStringParameters.skip) : 0;

    // Use connect method to connect to the server
    await client.connect();
    console.log('Connected successfully to server');

    const db = client.db(dbName);

    // Get the collection of urls and titles
    const collection = db.collection('shortylinks');

    // Find the first 7 documents in the collection sorted by _id in descending order, skipping the specified number of documents
    const docs = await collection.find({}).sort({ _id: -1 }).skip(skip).limit(7).toArray();

    // Create a new array to store the data with the extracted og:description and og:image values
    const dataWithOgValues = [];

    // Loop through each document (url and title)
    for (const doc of docs) {
      // Make a request to the url
      const html = await new Promise((resolve, reject) => {
        const protocol = doc.url.startsWith('https') ? https : http;
        protocol.get(doc.url, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve(data);
          });
        }).on('error', (err) => {
          reject(err);
        });
      });

      // Parse the HTML using htmlparser2
      const dom = parseDOM(html);

      // Find the og:description and og:image meta tags
      let ogDescription, ogImage;
      domutils.findAll((elem) => {
        if (elem.name === 'meta' && elem.attribs.property === 'og:description') {
          ogDescription = elem.attribs.content;
        }
        if (elem.name === 'meta' && elem.attribs.property === 'og:image') {
          ogImage = elem.attribs.content;
        }
      }, dom);

      // Use the description value from the database if it exists
      if (doc.description) {
        ogDescription = doc.description;
      }

      // If no description was found, generate one from the first lines of text on the page
      if (!ogDescription) {
        const pElem = domutils.findOne((elem) => elem.name === 'p', dom);
        if (pElem) {
          ogDescription = domutils.getText(pElem);
        }
      }

      // If no og:image was found, use the first image on the page
      if (!ogImage) {
        const imgElem = domutils.findOne((elem) => elem.name === 'img', dom);
        if (imgElem) {
          ogImage = imgElem.attribs.src;
        }
      }

      // Use a default image if no image was found
      if (!ogImage) {
        ogImage = '../img/default.png';
      }

      // Add a new object to the dataWithOgValues array with the extracted og:description and og:image values
      dataWithOgValues.push({
        ...doc,
        ogDescription,
        ogImage,
      });

      // Display the title, url, description and image
      console.log(`Title: ${doc.title}`);
      console.log(`URL: ${doc.url}`);
      console.log(`Description: ${ogDescription || 'No description found'}`);
      console.log(`Image: ${ogImage || 'No image found'}`);
    }

    // Close the database connection
    await client.close();

    return {
      statusCode: 200,
      body: JSON.stringify(dataWithOgValues),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: err.message,
    };
  }
};
