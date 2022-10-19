curl --location --request POST 'http://localhost:8080/entities/cars' \
--header "Authorization:  $(cat car_editor.jwt)" \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "Mercedes AMG",
    "description": "Testing car ADD with car_editor JWT",
    "year": 2020
}'