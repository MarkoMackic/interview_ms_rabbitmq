/*
since I wanted a visualization of what's going on it's embedded in this microservice, so I wouldn't have to make another one.. 

Basic engine, elementary phisics + turf for geo ...

HTTP and websockets for viualization

RabbitMQ emmitter 

Getting trips from ms_1 via RabbitMQ ( trips can be simulated )
*/

const cfg = require('./cfg');
const express = require('express');
const ws = require('ws');
const asyncHandler = require('express-async-handler');
const amqp = require('amqplib');
const trips = require('./trips');
const { simulation } = require('./simulation');
const process = require('process');

// gets the job done, I know there are better ways to do this, but hey, I'm writing POC.. 
const shared_app_ctx = {
    trips: [],
    simulating_trip_id: null,
    simulation: null,
    send_rabbitmq_json: null, // set by bootstrap_rabbitmq
    send_websocket_json: null, // set by bootstrap_app
}

function find_trip(tripID) {
    for(let trip of shared_app_ctx.trips)
    {
        if(trip.trip_id == tripID)
            return trip;
    }

    return null;
}

async function bootstrap_app() {

    const app = express();
    app.set('view engine', 'ejs');

    const wsServer = new ws.Server({ noServer: true });

    shared_app_ctx.send_websocket_json = function(msg) {
        wsServer.clients.forEach(c => c.send(JSON.stringify(msg)))
    }
    
    app.get("/", (req, res) => res.render("home.ejs", shared_app_ctx));

    app.get("/simulate/:tripId", asyncHandler(async function(req, res) {
        let trip = find_trip(req.params.tripID);

        if(!trip) {
            res.json({error: "Trip not found"});
            return;
        }

        shared_app_ctx.simulating_trip_id = trip.trip_id;
        
        shared_app_ctx.simulation = await simulation(trip);

        res.redirect("/simview");
    }))

    app.get("/simview", (req, res) => res.render("simview.ejs"))

    // SIMVIEW API PART 
    let router = express.Router();

    router.get("/stop_sim", (req, res) => {
        if(!shared_app_ctx.simulation)
            throw new Error("Simulation not created")

        shared_app_ctx.simulation.abort();
        shared_app_ctx.simulation = null;
        shared_app_ctx.simulating_trip_id = null;

        res.redirect("/");
    });

    router.get("/get_initial_data", (req, res) => {
        if(!shared_app_ctx.simulation)
            throw new Error("Simulation not created");

        return res.json(shared_app_ctx.simulation.getInitialData());
    });


    router.get("/start_sim", (req, res) => {
        if(!shared_app_ctx.simulation)
            throw new Error("Simulation not created");
        
        let handleData = async function(data) { 
            try{ 
                await shared_app_ctx.send_rabbitmq_json(data);
                // nothing to await, but anyways
                await shared_app_ctx.send_websocket_json(data);
            }
            catch(e)
            {
                // probably the channel closed .. nothing to do here anymore 
                process.exit(1)
            }
        }

        shared_app_ctx.simulation.simulate(handleData)

        res.send("Simulation started");
    });


    app.use("/simview_api", router);

    // SIMVIEW API END ( I didn't wanna create multiple files because of context sharing, and these are + features after all )
    
    // from mongo would be more convinent, but hey, we're demonstrating carrotMQ :-)
    app.get("/refresh_trips", asyncHandler(async function(req, res) { 
        shared_app_ctx.trips = (await trips.getTripsData()).trips;
        res.redirect("/")
    }));
    
    const server = app.listen(cfg.serverConfig.port, () => {
        console.log(`Example app listening on port ${cfg.serverConfig.port}`)
    });

    // error handler
    app.use((err, req, res, next) => {
        res.status(500).json({success: false, error: err.message || err.reason || "Something broke unexpectedly!"})
    })

    server.on('upgrade', (request, socket, head) => {
        wsServer.handleUpgrade(request, socket, head, socket => {
          wsServer.emit('connection', socket, request);
        });
    });
    
}

async function bootstrap_rabbitmq() {
    // the basic rabbitmq pattern fits here perfectly .. single producer, single consumer

    const conn = await amqp.connect(cfg.rabbitMQConfig.url);
    
    process.once('SIGINT', conn.close.bind(conn));

    const channel = await conn.createChannel();

    const queue = (await channel.assertQueue(cfg.rabbitMQConfig.channels.car_telemetry, {durable: false})).queue;

    shared_app_ctx.send_rabbitmq_json = async function(object_msg) {
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(object_msg)));
    }
}


bootstrap_rabbitmq().then(bootstrap_app).then(() => console.log("We're up and running")).catch(e => {
    console.error(e);
    process.exit(1);
})

process.on('uncaughtException', err => {
    process.exit(1)
})