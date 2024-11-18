
## Development environment
```
docker compose up -d mysql
npm run start:bff
npm run start:app

docker compose down
```

## Deployment
```
docker compose build
docker compose up -d
```


### Create .htpasswd for Password Protection
Install apache2-utils:

`sudo apt-get install apache2-utils`

Generate a password file:

`sudo htpasswd -c /etc/nginx/.htpasswd username`