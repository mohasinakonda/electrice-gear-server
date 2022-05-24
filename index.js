import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import jwt from 'jsonwebtoken';
import { MongoClient, ServerApiVersion } from 'mongodb';

const app = express()
const PORT = process.env.PORT || 5000
//midlewere
app.use(express.json())
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rqmun.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// verify user 
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ massage: 'unathorized access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {

            return res.status(403).send({ massage: 'forbiden access' })
        }
        req.decoded = decoded
        next()
    })
}
async function run() {
    try {
        await client.connect()
        const partsCollection = client.db("ElectricTools").collection("tools")
        const orderCollection = client.db("ElectricTools").collection("orders")
        const usersCollection = client.db("ElectricTools").collection("users")
        app.get('/tools', async (req, res) => {
            const query = {}
            const tools = await partsCollection.find(query).toArray()
            res.send(tools)
        })

        app.put('/users/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true }
            const updatedDoc = {
                $set: user
            }

            const updateUser = await usersCollection.updateOne(filter, updatedDoc, options)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN)
            res.send({ updateUser, token })

        })
        // insert orders
        app.post('/orders', async (req, res) => {
            const data = req.body
            const { name, img, price, stock, quantity, email } = data
            const doc = { name, email, img, price, stock, quantity, paid: false }
            const orderComplete = await orderCollection.insertOne(doc)
            res.send(orderComplete)

        })
        // get all all orders
        app.get('/orders', async (req, res) => {

            const orderComplete = await orderCollection.find().toArray()
            res.send(orderComplete)

        })
        // get orders for specific email or user 
        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email
            const filter = { email: email }
            const orderComplete = await orderCollection.find(filter).toArray()
            res.send(orderComplete)

        })
    } finally {

    }
}

app.get('/', (req, res) => {
    res.send({ massage: 'success' })
})

run().catch(console.dir)

app.listen(PORT, () => {
    console.log('server is running')
})