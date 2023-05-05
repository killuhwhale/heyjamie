# Create T3 App



Needed to add in prisma.schema and then run: npx prisma generate (for cahnges to take effect.)

 - binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
 TO:
    generator client {
        provider = "prisma-client-js"
        binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
    }

Deploy to Railway
You can use a PaaS such as Railway’s↗ automated Dockerfile deployments↗ to deploy your app. If you have the Railway CLI installed↗ you can deploy your app with the following commands:

railway login
railway init
railway link
railway up
railway open

Go to “Variables” and include your DATABASE_URL. Then go to “Settings” and select “Generate Domain.”

gcloud auth application-default login

# TODO

- GAuth
    - Need redirect URL in Google Console
    - once i deploy and get a domain, i will update and test.
