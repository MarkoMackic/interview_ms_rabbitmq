// dummy dummy car simulator 
const uuidv4 = require('uuid').v4;
var _ = require('lodash');
const Controller = require('node-pid-controller');

function car() 
{
    const speed_pid = new Controller({
        k_p: 0.3,
        k_i: 0.01,
        k_d: 0.01
    });

    const physics = {
        max_acceleration: 5, // m / s^2
        max_velocity: 13.9, // m / s
    }

    const default_currents = {
        velocity: 0,
        acceleration: 1,
        travel_distance: 0,
        travel_delta: null,
        last_update_time: null,
        desired_velocity: 0
    }

    const currents = Object.assign({}, default_currents);

    setTargetSpeed(currents.desired_velocity)

    let subscribers = {};

    // speed in m/s
    function setTargetSpeed(speed) {
        if(currents.desired_velocity == speed)
            return;
        currents.desired_velocity = speed;
        speed_pid.setTarget(currents.desired_velocity)
    }

    function getCurrents()
    {
        return currents;
    }

    function subscribeToSimulations(callback)
    {
        let uuid = uuidv4();

        subscribers[uuid] = callback;

        // return unsubscribe.. memory leak ? 
        return function() {
            delete subscribers[uuid];
        }
    }

    function reset()
    {
        currents = Object.assign({}, default_currents);
    }

    function simulate()
    {
        let now = Date.now() / 1000; // we work with seconds
        
        if(currents.last_update_time == null)
            currents.last_update_time = now
        
        let time_diff = now - currents.last_update_time; // s


        currents.acceleration = _.clamp(speed_pid.update(currents.velocity), -physics.max_acceleration, physics.max_acceleration);
        currents.velocity = currents.velocity + time_diff * currents.acceleration;
        currents.travel_delta =  (currents.velocity * time_diff + (currents.acceleration * Math.pow(time_diff, 2)) / 2)
        currents.travel_distance = currents.travel_distance + currents.travel_delta;

        // push the data to subscribers
        for(let sub of Object.values(subscribers)){
            sub(currents);
        }

        currents.last_update_time = Date.now() / 1000;
    }
    return {
        // need to be called on regular intervals .. 
        simulate,
        subscribeToSimulations,
        setTargetSpeed,
        getCurrents,
        reset
    }
}



module.exports = {
    car
}