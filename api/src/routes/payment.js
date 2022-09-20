const { Router } = require("express");
const mercadopago = require("mercadopago");
const cors = require("cors");
const { Purchase } = require("../db.js");
require("dotenv").config();
const { ACCESS_TOKEN } = process.env;

const payment = Router();
//payment.use(cors());
mercadopago.configure({
  access_token: ACCESS_TOKEN,
});

payment.post("/", async (req, res, next) => {
  //const {products, schedule} = req.body;
  const latest_id = await Purchase.findAll({
    limit: 1,
    order: [["purchase_id", "DESC"]],
  });
  const purchase_id = latest_id.length === 0 ? 1 : latest_id[0] + 1;

  //*******************Test data*******************
  const products = [
    { product_id: 4, name: "Coca Cola 750cc", quantity: 50, price: 3 },
    { product_id: 5, name: "Sprite 750cc", quantity: 30, price: 2.5 },
    { product_id: 3, name: "Hot Dog", quantity: 5, price: 1.5 },
  ];
  const schedule = {
    schedule_id: 1,
    seats: ["A01", "A02"],
    title: "Beast",
    display: "2D",
    day: "2022-09-04",
    price: 10.5,
  };
  const mp_items = products.map((product) => ({
    title: product.name,
    quantity: product.quantity,
    unit_price: product.price,
  }));
  mp_items.push({
    title: schedule.title,
    quantity: schedule.seats.length,
    unit_price: schedule.price,
  });
  //Creo la compra en "Started"
  let individualProductTotal = products.map(
    (product) => product.quantity * product.price
  );
  const user_id = "1234567";
  let purchaseTotal = 0;
  individualProductTotal.forEach((amount) => (purchaseTotal += amount));
  purchaseTotal += schedule.price;
  const newPurchase = await Purchase.create({
    amount: purchaseTotal,
    status: "created",
    user_id,
  });
  let mpPreference = {
    items: mp_items,
    external_reference: newPurchase.purchase_id.toString(),
    payment_methods: {
      excluded_payment_types: [
        {
          id: "atm",
        },
      ],
      installments: 3,
    },
    back_urls: {
      success: "http://localhost:3000/cinema",
      failure: "http://localhost:3000/cinema/login",
      pending: "http://localhost:3000/cinema/register",
    },
  };
  mercadopago.preferences
    .create(mpPreference)
    .then((response) => {
      console.log("respondio");
      global.id = response.body.id;
      console.log(response.body);
      return res.status(200).send({ id: global.id });
    })
    .catch((err) => {
      console.log(err);
      return res.status(400).send(err);
    });
  //*******************End*******************
  //return res.status(200).send(newPurchase);
  // const carrito = [
  //   { title: "Producto 1", quantity: 5, price: 10.5 },
  //   { title: "Producto 2", quantity: 10, price: 9.5 },
  //   { title: "Producto 3", quantity: 8, price: 12.5 },
  // ];
  // const items_ml = carrito.map((item) => ({
  //   title: item.title,
  //   unit_price: item.price,
  //   quantity: item.quantity,
  // }));
  // let preference = {
  //   items: items_ml,
  //   external_reference: `${id_orden}`,
  //   payment_methods: {
  //     excluded_payment_types: [
  //       {
  //         id: "atm",
  //       },
  //     ],
  //     installments: 3,
  //   },
  //   back_urls: {
  //     success: "http://localhost:3000/cinema",
  //     failure: "http://localhost:3000/cinema/login",
  //     pending: "http://localhost:3000/cinema/register",
  //   },
  // };
  // mercadopago.preferences
  //   .create(preference)
  //   .then((response) => {
  //     console.log("respondio");
  //     global.id = response.body.id;
  //     console.log(response.body);
  //     return res.status(200).send({ id: global.id });
  //   })
  //   .catch((err) => {
  //     console.log(err);
  //     return res.status(400).send(err);
  //   });
});

payment.get("/pagos", (req, res) => {
  console.info("EN LA RUTA DE PAGOS ", req);
  const payment_id = req.query.payment_id;
  const payment_status = req.query.status;
  const external_reference = req.query.external_reference;
  const merchant_order_id = req.query.merchant_order_id;
  console.log("EXTERNAL REFERENCE ", external_reference);
  return res.redirect("http://localhost:3000/cinema");
});

payment.get("/pagos/:id", (req, res) => {
  const mp = new mercadopago(ACCESS_TOKEN);
  const id = req.params.id;
  console.info("Buscando el id", id);
  mp.get(`/v1/payments/search`, { status: "success" })
    .then((resultado) => {
      console.info("resultado", resultado);
      res.status(200).send({ resultado: resultado });
    })
    .catch((err) => {
      console.error("No se consulto:", err);
      res.status(400).send({ error: err });
    });
});

payment.post("/processPayment", async (req, res) => {
  const { amount, products, functions } = req.body;
  //console.log(req);
  //if (!amount || !products || !functions)
  //return res.status(400).send({ message: "All data must be sent" });
  try {
    const newPayment = await stripe.paymentIntents.create({
      amount,
      currency: "ARS",
      description: "Test purchase",
      payment_method: "card",
      confirm: true,
    });
    return res.status(200).send(newPayment);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
});

payment.post("/test", async (req, res) => {
  try {
    const pago = await Stripe.paymentIntents.create({
      amount: 1099,
      currency: "USD",
      automatic_payment_methods: { enabled: true },
    });
    return res.status(200).send({ client_secret: pago.client_secret });
  } catch (err) {
    return res.status(500).send(err);
  }
});

module.exports = payment;
