# PART 1

## ms_1 - Microservice A

This is microservice for managing entities

Entities are stored in MongoDB.

There are 3 types of entites, main being `Driver` and `Car`, and the link between them being `Trip`

`Trips` can be simulated

This microservice exposes rpc channel for getting the trips used by ms_2, e.g. it would be easier to get them with mongo node driver
directly from ms_2, but this is for PoC sake. There is included `postman_api.json`, so you can analyze the API.

`mongo_dump` is imported to mongo, so you have some data to work with. You can simulate a trip.


# ms_2 - Microservice B

Most interesting one. Incorporates small physics engine (acceleration, velocity, travel_distance), rabbitmq publisher for ms_3,
websockets publisher for simulation view. Simulations are realtime ( no fast forwarding ability .. ). Handling of simulation 
end is not done ( you would need to wait for hours for service to fail, anyways all of the interesting parts that represent the concept 
happen within first 10 % of route ). There is http interface for this service to initiate the simulation .. 

# ms_3 - Microservice C 

Monitors telemetry data from ms_2 and adds penalty points to Mongo, exposes REST endpoint for fetching.
Data is accumulative (e.g grouped per driver id).


# PART 2

1. OPA can be a good fit to control resource access ( demonstrated here using jwt - only ms_1), but yeah, I think it's only of use where most components are 
   OPA enabled, it's a simple abstraction.

2. The benefit is centralized policy control inside a system. And also many ( probably ) cncf projects support it out of the box.. 

3. It would run a another container ( e.g it's server implementation ) , so the whole stack has access to it.

I'm not really thrilled by these simple abstractions ( e.g. Helm3 for example, come on, simple template preprocessor (you could use sed and kubectl for most
of what you use helm for)), but if the whole stack supports them, then they are a good fit.

# PART 3

1. Demonstrates OPA use when creating entities ( ms_1 )
2. To enable OPA, look at `docker-compose.yaml`, by default it's off


# Final notes 

Thanks to all the OSS source maintainers for libraries used here, doc writers, and bloggers ( https://pongzt.com/post/opa-intro/ )

# Instructions

You can start by reading the code .. also when you do `docker-compose up`, check out localhost:8080 (ms_1), localhost:8081 (ms_2), localhost:8082 (ms_3)

It can take time for npm install to do it's thing, so before trying anything wait for all containers to be up ( not up by `docker ps`), but up in a sense
you can access them from browser (8080, 8081, 8082).