const cfg = require('./cfg');
const amqp = require('amqplib');
const convert = require('convert-units');
const process = require('process');
const mongoose = require('mongoose');
const {faults} = require('./model');
const express = require('express');
const asyncHandler = require('express-async-handler');

async function bootstrap_client() {

    const conn = await amqp.connect(cfg.rabbitMQConfig.url);

    const chann = await conn.createChannel();
    
    const queue = (await chann.assertQueue(cfg.rabbitMQConfig.channels.car_telemetry, { durable: false })).queue;

    /*
        analasys is streaming ( e.g linear with time )
        | represents points where the remainder of range distance is transferred to lower level

        
        50kmh---                                          |------
        60kmh   ------                            |-------
        80kmh         ------            |---------
        100kmh              ------------
    */ 
  
    const store = {
        'range1' : 0,
        'range2' : 0,
        'range3' : 0
    }

    async function checkAndPunish(store, key, points, tdata)
    {
        if(store[key] > 1000)
        {
            store[key]-= 1000;

            let new_data = await faults.findOneAndUpdate({driver: tdata.driver_id}, {
                $inc: {
                   points: points
                }
            }, {upsert: true, new: true})

            console.log(`Punished driver ${tdata.driver_id} with ${points} points !` , new_data);
        }
    }

    async function onMessage(msg) { 
        let telemetry_data = JSON.parse(msg.content.toString());

        const speed_kmh = convert(telemetry_data.velocity).from("m/s").to("km/h");
        const travel_delta = telemetry_data.travel_delta; // in meters
        
        if(speed_kmh > 60 && speed_kmh <= 80)
        {
            await checkAndPunish(store, 'range1', 1, telemetry_data);
            store.range1 += travel_delta;
        }
              
        if(speed_kmh > 80 && speed_kmh <= 100)
        {
            await checkAndPunish(store, 'range2', 2, telemetry_data);
            store.range2 += travel_delta;
        }

        if(speed_kmh > 100) 
        {
            await checkAndPunish(store, 'range3', 5, telemetry_data);
            store.range3 += travel_delta;
        }
        
        // transfer down the remainings ( there should never be more than 1000 m in a store by this logic ? )

        if(speed_kmh < 100 && store.range3 != 0)
        {
            store.range2 += store.range3;
            store.range3 = 0;
        }

        if(speed_kmh < 80 && store.range2 != 0)
        {
            store.range1 += store.range2;
            store.range2 = 0;
        }
    }


    chann.consume(queue, onMessage, { noAck: true} );

    return "Started and waiting for messages ..."
}


async function bootstrap_db() 
{
    await mongoose.connect(cfg.dbConfig.url);

    console.log("connected to database");
}

async function bootstap_server()
{
    const app = express();

    app.use(express.json());

    app.get("/", (req, res) => res.send("Hello from container 3.. Go to /faults to get json of driver/fault .. "));

    app.all("/faults", asyncHandler(async (req, res) => {
        res.json(await faults.find().exec());
    }));

    app.listen(cfg.serverConfig.port, () => {
        console.log(`Example app listening on port ${cfg.serverConfig.port}`)
    });

    app.use((err, req, res, next) => {
        res.status(500).json({success: false, error: err.message || err.reason || "Something broke unexpectedly!"})
    })
}

bootstrap_db().then(bootstrap_client).then(bootstap_server).then(console.log).catch(e => {
    console.error(e);
    process.exit(1);
})

process.on('uncaughtException', err => {
    process.exit(1)
})