mongoimport --host mongodb --db our_app_db --collection cars --type json --file /mongo_dump/cars.json --jsonArray
mongoimport --host mongodb --db our_app_db --collection drivers --type json --file /mongo_dump/drivers.json --jsonArray
mongoimport --host mongodb --db our_app_db --collection trips --type json --file /mongo_dump/trips.json --jsonArray