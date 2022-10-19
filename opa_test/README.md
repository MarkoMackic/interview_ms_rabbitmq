## Testing OPA funcs

Simple tests using curl, I wrote a single one for failiure and success, but generated tokens for you if you wanna experiment.

Anyways jwt-secret is `dummy-secret`.. 

JSON contained is in format :

```
{
  "roles": [
    "ROLE"
  ]
}
```

To enable OPA, look at `docker-compose.yaml`, by default it's off, anyone can do anything.. 

