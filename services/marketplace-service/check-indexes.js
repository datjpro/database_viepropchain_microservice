const { MongoClient } = require('mongodb');

async function checkIndexes() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('viepropchain');
  
  console.log('=== LISTINGS COLLECTION INDEXES ===');
  const indexes = await db.collection('listings').indexes();
  indexes.forEach((index, i) => {
    console.log(`${i + 1}. ${index.name}:`, index.key);
    if (index.unique) console.log('   -> UNIQUE');
  });
  
  console.log('\n=== SAMPLE LISTING DOCUMENT ===');
  const sample = await db.collection('listings').findOne({});
  if (sample) {
    console.log('Document fields:', Object.keys(sample));
    if (sample.listingId !== undefined) {
      console.log('⚠️ Found listingId field:', sample.listingId);
    }
  }
  
  await client.close();
}

checkIndexes().catch(console.error);