import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET)

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
        const reviewsCollection = client.db("ElectricTools").collection("reviews")
        const blogsCollection = client.db("ElectricTools").collection("blogs")

        app.get('/tools', async (req, res) => {
            const query = {}
            const tools = await partsCollection.find(query).toArray()
            res.send(tools)
        })
        // add products
        app.post('/tools', async (req, res) => {
            const data = req.body
            console.log(data)
            const addComplete = await partsCollection.insertOne(data)
            res.send(addComplete)

        })
        // delete products 
        app.delete('/tools/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }

            const deleteParts = await partsCollection.deleteOne(filter)
            res.send(deleteParts)

        })
        // create  user 
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
        // get all user by admin 
        app.put('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email

            const filter = { email: email }
            const updatedDoc = {
                $set: { role: 'admin' }
            }

            const updateUser = await usersCollection.updateOne(filter, updatedDoc)

            res.send(updateUser)

        })

        app.put('/users/update/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const data = req.body

            const filter = { email: email }
            const updatedDoc = {
                $set: {
                    city: data.city,
                    country: data.country,
                    age: data.age,
                    img: data.img

                }
            }

            const updateUser = await usersCollection.updateOne(filter, updatedDoc)

            res.send(updateUser)

        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        app.get('/users', async (req, res) => {

            const query = {}
            const users = await usersCollection.find(query).toArray()
            res.send(users)
        })
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const users = await usersCollection.find(query).toArray()
            res.send(users)
        })

        // insert orders
        app.put('/orders', async (req, res) => {
            const data = req.body
            const { name, img, price, stock, quantity, email } = data
            const doc = { name, email, img, price, stock, quantity, paid: false }
            const orderComplete = await orderCollection.insertOne(doc)
            res.send(orderComplete)

        })
        // get all all orders
        app.get('/orders', verifyJWT, async (req, res) => {

            const orderComplete = await orderCollection.find().toArray()
            res.send(orderComplete)

        })

        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const orderComplete = await orderCollection.find(filter).toArray()
            res.send(orderComplete)

        })


        // get orders for specific email or user 

        app.get('/order', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const orders = await orderCollection.find(query).toArray();
                return res.send(orders);
            }
            else {
                return res.status(403).send({ message: 'forbidden access' });
            }
        })

        //------------------ reviews ---------------------
        app.post('/review', async (req, res) => {
            const data = req.body
            const review = await reviewsCollection.insertOne(data)
            res.send(review)
        })
        //get review
        app.get('/review', async (req, res) => {
            const query = {}
            const review = await reviewsCollection.find(query).toArray()
            res.send(review)

        })
        // -------------------stripe payment-------------


        app.post("/create-payment-intent", async (req, res) => {
            const amount = req.body;
            const price = amount * 100


            const paymentIntent = await stripe.paymentIntents.create({
                amount: calculateOrderAmount(price),
                currency: "usd",
                payment_methods_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        //   --------blogs------------
        app.get('/blogs', async (req, res) => {
            const blogs = await blogsCollection.find().toArray()
            res.send(blogs)
        })
        app.get('/blogs/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const blog = await blogsCollection.findOne(filter).toArray()
            res.send(blog)
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