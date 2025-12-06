console.log('MongoDB update script...');

const { MongoClient } = require('mongodb');

async function fixPrices() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('viepropchain');
  const collection = db.collection('listings');
  
  // Sửa listing có price khổng lồ
  const result = await collection.updateOne(
    { propertyId: '692b3b997540c6eee50380ab' },
    { $set: { 'price.amount': '15000000000000000000' } }
  );
  
  console.log('Updated listings:', result.modifiedCount);
  
  // Hiển thị kết quả
  const updated = await collection.findOne({ propertyId: '692b3b997540c6eee50380ab' });
  console.log('New price:', updated.price);
  
  await client.close();
}

fixPrices().catch(console.error);