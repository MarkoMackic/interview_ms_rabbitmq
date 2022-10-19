// Microservice with resful API

/*
Questions related to task definition:
    1. Where should entities be stored ? 
    2. Does anyone have rights to create them ?
    3. Is this just REST API, or should there be some frontend application to create the entities ? 
    4. Which entities ( frequent use of etc. ) ? 

Based on this I will proceed to do as I wish regarding the questionable stuff.

    1. Entities will be stored in Mongo
    2. Anyone has right to do the CRUD ( well you know if that OpenPolicy is not on.. )
    3. It's just the REST API
    4. Only entities definied in the document before etc.
    
*/


const cfg = require('./cfg');
const express = require('express');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const ampq = require('amqplib');
const entity_utils = require('./entity_utils')();
const process = require('process');

let rabbitmq_ctx = {}

async function bootstrap_db() 
{
    await mongoose.connect(cfg.dbConfig.url);

    console.log("connected to database");
}

function bootstrap_app()
{
    const app = express();

    app.use(express.json());

    app.get("/", (req, res) => res.send("Hello from container 1.. This container is for CRUD ops.."));

    app.all("/entities/:entity_type/:entity_id?", asyncHandler(entity_utils.handle_request))

    app.listen(cfg.serverConfig.port, () => {
        console.log(`Example app listening on port ${cfg.serverConfig.port}`)
    });

    app.use((err, req, res, next) => {
        res.status(500).json({success: false, error: err.message || err.reason || "Something broke unexpectedly!"})
    })
}

async function bootstrap_rabbitmq()
{
    const conn = await ampq.connect(cfg.rabbitMQConfig.url);
    
    // close on client interruption
    process.once('SIGINT', conn.close.bind(conn));

    // we'll do rpc here just to demonstrate ( e.g. we'll get trips from this microservice )
    const channel = await conn.createChannel();
    await channel.assertQueue(cfg.rabbitMQConfig.channels.ms1_rpc, {durable: false});

    channel.prefetch(1);

    const reply = async function(msg) 
    {
        try 
        {
            const req = JSON.parse(msg.content.toString())
            
            if(!req.method)
                throw new Error("Methods must be specifed");
            
            if(req.method !== 'getTrips')
                throw new Error("Method not supported");

            const trips = await mongoose.model('trip').find().exec();

            channel.sendToQueue(
                msg.properties.replyTo,
                Buffer.from(JSON.stringify({trips: trips})),
                {correlationId: msg.properties.correlationId}
            );
    
            channel.ack(msg)
        }
        // also helpful if json parsing fails.. ( and simplifies early exit )
        catch(e)
        {
            channel.sendToQueue(msg.properties.replyTo,
                Buffer.from(JSON.stringify({error: e.message || e.reason || "Unexpected error"})),
                {correlationId: msg.properties.correlationId});
    
            channel.ack(msg)
        }
    }

    await channel.consume(cfg.rabbitMQConfig.channels.ms1_rpc, reply) 
}


bootstrap_db().then(bootstrap_app).then(bootstrap_rabbitmq).catch((e) => {
    console.error(e);
    process.exit(1);
});

process.on('uncaughtException', err => {
    process.exit(1)
})