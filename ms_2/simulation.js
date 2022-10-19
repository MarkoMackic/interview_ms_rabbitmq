const fs = require('fs').promises;
const turf = require('@turf/turf');
const { car } = require('./car');
const convert = require('convert-units');

async function simulation(trip, user_params = {}) {


    const sim_params = Object.assign({
        sim_interval: 500 // in ms
    }, user_params);

    /*
        Let's explain the driving profile 
        It contains 2 thing, expressed_in, and values

        expressed_in supports 2 values : percentages | km
        values: 
            key-value pair expressing what to do when km/percentage is greater than assigned,
            must include 0 ( so it should know what to do when starting ),
            value represent speed ( in km/h ) after crossed key ( e.g there is some delay before reaching speed, we have some physics there )

        I'm too lazy to write a validator for this stuff so if you experiment, stick to the format. 


        For passing in kilometers you'd need to know your path .. 
    */
    if(!sim_params.driving_profile)
    {
        sim_params.driving_profile = {
            expressed_in : 'percentage',
            values: {
                0: 65,
                1: 85,
                2: 110,
                3: 85,
                4: 30,
                5: 100,
                40: 80,
                70: 110,
                90: 40
            }
        };
    }

    // genearte a map
    sim_params.start = 0;

    if(trip.trip_simulation == 'RANDOM')
    {
        sim_params.linestring = turf.randomLineString(1, {num_vertices:50, max_length: 0.1}).features[0];   
    }
    else
    {
        let content = await fs.readFile('./route1.json', {encoding: 'utf-8'});

        content = JSON.parse(content.toString());   
        
        sim_params.linestring = turf.lineString(content.features[0].geometry.coordinates);
    }

    sim_params.trip_id = trip.id;
    sim_params.car_id = trip.car;
    sim_params.driver_id = trip.driver;

    sim_params.end = turf.length(sim_params.linestring) * 1000; // meters please

    const def_sim_state = {
        progress: 0,
        aborted: false,
    }

    const sim_state = Object.assign({}, def_sim_state);

    const sim_car = car();

    function simulate(callback) {
        
        let car_currents = sim_car.getCurrents();

        sim_state.progress = (car_currents.travel_distance / sim_params.end) * 100
        
        for(let dp_key of Object.keys(sim_params.driving_profile.values).sort().reverse())
        {
            // one very ugly if.. 
            if( 
                (sim_params.driving_profile.expressed_in == 'percentage' && sim_state.progress >= Number(dp_key)) ||
                (sim_params.driving_profile.expressed_in == 'kilometers' && car_currents.travel_distance >= Number(dp_key) * 1000 )
            )
            {
                sim_car.setTargetSpeed(convert(sim_params.driving_profile.values[dp_key]).from('km/h').to('m/s'))
                break;
            }
        }

        sim_car.simulate();
        
        callback(getCarData());

        if(!sim_state.aborted)
            setTimeout(simulate.bind(this, callback), sim_params.sim_interval)
    }

    function abort() {
        sim_state.aborted = true;
    }
    
    function getCarCoordinates() {
        return turf.along(sim_params.linestring, sim_car.getCurrents().travel_distance / 1000)
    }
    
    function getInitialData() {
        return {
            ...sim_params,
            car: getCarData()
        }
    }

    function getCarData() {
        return {
            ...sim_car.getCurrents(),
            coord: getCarCoordinates(),
            driver_id: sim_params.driver_id,
            car_id: sim_params.car_id,
            trip_id: sim_params.trip_id
        }
    }

    return {
        simulate,
        abort,
        getInitialData,
    }
}

module.exports = {
    simulation
}