curl --location --request POST 'http://localhost:8080/entities/cars' \
--header "Authorization:  $(cat car_creator.jwt)" \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "Mercedes G Class",
    "description": "Testing car ADD with car_creator JWT",
    "year": 2022
}'