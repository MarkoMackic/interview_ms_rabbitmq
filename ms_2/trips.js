const cfg = require('./cfg');
const amqp = require('amqplib');
const uuidv4 = require('uuid').v4;

async function getTripsData() { 
    return await new Promise(async (data, error) => {
        const conn = await amqp.connect(cfg.rabbitMQConfig.url);
        const uuid = uuidv4();

        let timeout = setTimeout(() => error("Didn't recieve items on time"), 1000);

        const answerCallback = function(msg)
        {
            clearTimeout(timeout);
            data(JSON.parse(msg.content.toString()));
            conn.close();
        }

        const chann = await conn.createChannel();
      
        const resp_queue = (await chann.assertQueue('', {exclusive: true})).queue;
        
        chann.consume(resp_queue, answerCallback, {noAck: true});
        
        chann.sendToQueue(cfg.rabbitMQConfig.channels.ms1_rpc, Buffer.from(JSON.stringify({method: 'getTrips'})), {
            correlationId: uuid, replyTo: resp_queue
        });
    })
}


module.exports = {
    getTripsData
}