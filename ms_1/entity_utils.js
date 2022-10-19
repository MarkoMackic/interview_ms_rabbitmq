/*
CRUD definition ( method -> action ) :
    -> get ( listing ..)
    -> put/post ( adding .. )
    -> patch ( editing .. )
    -> delete ( deliting .. )


    e.g. toUpperCase calls are just so I don't have to think about it.. 

*/
const cfg = require('./cfg.js');
const models = require('./models/index.js');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const entity_utils = function() { 
    const get_type_from_req = function(req) {
        switch(req.params.entity_type){
            case 'cars':
                return models.cars;
            case 'drivers':
                return models.drivers;
            case 'trips':
                return models.trips;
            default:
                throw Error("Not implemented")
        }
    }

    const default_handler = {
        get: async function(req, res) 
        {
            let result = req.params.entity_id ? await get_type_from_req(req).findById(req.params.entity_id).exec() : await get_type_from_req(req).find().exec();
            
            res.json(result !== null ? result : { success:false, status: "Not found"} );
        },
        patch: async function(req, res)
        {
            const status = await get_type_from_req(req).findByIdAndUpdate(req.params.entity_id, req.body).exec();

            res.json(status !== null ? {previousObject: status} : {success:false, status: "Not found"})
        },
        put: async function(req, res)
        {
            let new_resource = new get_type_from_req(req)(req.body);
            
            let {id} = await new_resource.save();

            res.json({id})
        },
        delete: async function(req, res)
        {
            const status = await get_type_from_req(req).findByIdAndRemove(req.params.entity_id).exec();

            res.json(status !== null? {id: status.id} :  {success: false, status: "Not found"});
        }
    }

    // rewire post
    default_handler.post = default_handler.put;
    
    async function handle_request(req, res) { 

        if(!req.params.entity_id && !['GET', 'PUT', 'POST'].includes(req.method.toUpperCase()))
            return res.status(400).send("Only GET and PUT methods supported in this context.");
        
        if(['PUT', 'POST'].includes(req.method.toUpperCase()) && req.params.entitity_id) {
            throw new Error("PUT/POST method shouldn't include entity id..");
        }

        if(!['cars', 'trips', 'drivers'].includes(req.params.entity_type))
            return res.status(400).send("Unknown entity");       
        
        // opa handling 
        if(cfg.opaConfig.enabled && ['PUT', 'POST', 'PATCH', 'DELETE'].includes(req.method.toUpperCase()))
        {
            // we'll have to have jwttoken here . 
            const token = req.headers.authorization
            
            if (!token) {
                throw new Error("No authorization header, and we're in OPA enabled mode")
            }

            const decodedToken = jwt.verify(token, cfg.serverConfig.jwt_secret);

            let action_map = {
                'POST': 'create',
                'PUT': 'create',
                'PATCH': 'update',
                'DELETE': 'delete'
            }

            const action = action_map[req.method.toUpperCase()];
            const object = req.params.entity_type.slice(0, -1);
            
            const opa_req = {
                input: {
                  subject: decodedToken,
                  action,
                  object,
                }
            };

            const client = axios.create({baseURL: cfg.opaConfig.url});

            const resp = await client.post("/v1/data/permission/allow", opa_req);
            
            const allow = resp.data?.result

            if (!allow) {
              throw new Error(`You are not allowed to ${action} ${object}`);
            }
        }
        
        await default_handler[req.method.toLowerCase()](req, res);

        if(!res.headersSent) {
            res.status(400).json({error: "No handlers for call"});
        }
    }

    return {
        handle_request
    }
};

module.exports = entity_utils;