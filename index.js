import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { MongoClient, ServerApiVersion } from 'mongodb';

const app = express()
const PORT = process.env.PORT || 5000
//midlewere
app.use(express.json())
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rqmun.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
    const collection = client.db("test").collection("devices");
    // perform actions on the collection object
    client.close();
});

async function run() {
    try {
        await client.connect()
        const partsCollection = client.db("electric-parts").collection("parts")
        console.log('db connect')
    } finally {

    }
}

run().catch(console.dir)

app.listen(PORT, () => {
    console.log('server is running')
})