const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_API_KEY);

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mol88.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();

    //connecting to database and collection
    const database = client.db("hero");
    const userCollection = database.collection("user");

    app.post("/create-user", async (req, res) => {
      const userData = req.body;
      const result = await userCollection.insertOne(userData);
      res.json(result);
    });

    app.get("/get-user", async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const result = await userCollection.findOne(query);
      res.json(result);
    });

    app.get("/get-all-user", async (req, res) => {
      let query = {};
      const pageNumber = req.query.pageNumber;
      if (req.query.searchText) {
        console.log("indide");
        query = {
          $or: [
            { name: { $in: [req.query.searchText] } },
            { phone: { $in: [req.query.searchText] } },
            { email: { $in: [req.query.searchText] } },
          ],
        };
      } else if (req.query.ageRange) {
        console.log("range");
        query = ageRangeQuery(parseInt(req.query.ageRange));
      }
      console.log("q:", query);
      const cursor = userCollection.find(query);
      const totalUsers = await cursor.count();
      let result;
      if (pageNumber) {
        result = await cursor
          .skip(pageNumber * 1)
          .limit(1)
          .toArray();
      } else {
        result = await cursor.toArray();
      }

      res.json({
        totalUsers,
        result,
      });
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

const ageRangeQuery = (value) => {
  let query = {};
  if (value == 0) {
    query = {};
    console.log("value:", value);
  } else if (value == 1) {
    query = { age: { $gte: "18", $lte: "25" } };
    console.log("value:", value);
  } else if (value == 2) {
    query = { age: { $gte: "26", $lte: "35" } };
    console.log("value:", value);
  } else if (value == 3) {
    query = { age: { $gte: "35" } };
    console.log("value:", value);
  }
  return query;
};
