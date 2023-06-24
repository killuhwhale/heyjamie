
# Prisma - Adding GAuth
Needed to add in prisma.schema and then run: npx prisma generate (for cahnges to take effect.)

 - binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
 TO:
    generator client {
        provider = "prisma-client-js"
        binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
    }

# Local GCP auth
gcloud auth application-default login
# Prod GCP Auth
DigitalOcean Env osrskey.json for GCP service account, need to manually add to droplet each deployment...
echo '' >> osrskey.json (file is in downloads on local machine, place in root on Droplet)


# TODO

- GAuth
    - Need redirect URL in Google Console
    - once i deploy and get a domain, i will update and test.




Pricing table
Feature	Free per month	Price after free usage limit is reached
Neural2 voices	0 to 1 million bytes	    $0.000016 USD per byte      ($16.00 USD per 1 million bytes)
Studio (Preview) voices	0 to 100K bytes	    $0.00016 USD per byte       ($160.00 USD per 1 million bytes)
Standard voices	0 to 4 million characters	$0.000004 USD per character ($4.00 USD per 1 million characters)
WaveNet voices	0 to 1 million characters	$0.000016 USD per character ($16.00 USD per 1 million characters)