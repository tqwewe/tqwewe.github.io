+++
title = "A Guide to Setting Up TimeScaleDB on Kubernetes"
description = "A quick guide on installing TimeScaleDB on Kubernetes"
date = 2024-07-10
updated = 2024-12-02
draft = false
template = "blog/page.html"

[extra]
lead = "A quick guide on installing TimeScaleDB on Kubernetes"
+++

As with most of my devops experience, setting up TimeScaleDB on my Kubernetes cluster has been a painful process
of trying different solutions and digging through Github issues until I succeed.

Initially, I tried using TimeScaleDB outside Kubernetes using DigitalOcean's managed postgres database, which comes
with support for TSDB, with one caveat – the Apache license version of TSDB doesn't support data retention among other
features. The full list of lacking features can be found at <https://docs.timescale.com/about/latest/timescaledb-editions/#feature-comparison>.

As data retention was a requirement for my project and is only available on the community license,
I decided to install TSDB in my existing Kubernetes cluster, and here's how I did it.

## You Might Not Need the Community License

If your only reason for switching from the Apache License to the Community License is to utilize data retention in TimescaleDB, **a simple cron job may suffice**. Otherwise, you can skip this section.

By default, a TimescaleDB hypertable stores data in chunks of 7-day intervals. However, this can be configured when creating a hypertable by specifying the interval. For example:

```sql
SELECT create_hypertable('odds', by_range('timestamp', INTERVAL '24 hours'));
```

This would create a hypertable with chunks of 24-hour intervals.

Using the [pg_cron] extension—which your hosting provider likely already offers—we can set up a simple cron job to [manually drop chunks] older than a given date.

```sql
SELECT cron.schedule(
  'odds-cleanup',
  '0 0 * * *', -- every day at midnight
  $$ SELECT drop_chunks(interval '24 hours', 'odds'); $$
);
```

[manually drop chunks]: https://docs.timescale.com/use-timescale/latest/data-retention/manually-drop-chunks/
[pg_cron]: https://github.com/citusdata/pg_cron

## Failures

The TSDB docs show a list of recommended Kubernetes operators on their docs including:

- [StackGres]
- [Postgres Operator (Patroni)]
- [PGO]
- [CloudNativePG]

[stackgres]: https://github.com/ongres/stackgres
[postgres operator (patroni)]: https://github.com/zalando/postgres-operator
[pgo]: https://github.com/CrunchyData/postgres-operator
[cloudnativepg]: https://github.com/cloudnative-pg/cloudnative-pg

I tried all of these, having success with only one: CloudNativePG.

StackGres and Postgres Operator both come with the apache license of TSDB. I did find a promising comment on a
[Github issue] for using the Community license of TSDB, however even after following the instructions, postgres still
didn't let me apply a retention policy to my hypertable, due to tsdb still using the apache license.

[Github issue]: https://github.com/zalando/postgres-operator/issues/2132#issuecomment-2143626146

## CloudNativePG with TSDB (Community License)

Setting up CloudNativePG with TimeScaleDB Community License was a lot less painful than the other options.

Installing CloudNativePG can be done with a one liner:

```bash
kubectl apply --server-side -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.23/releases/cnpg-1.23.2.yaml
```

*Make sure to use the [latest release].*

[latest release]: https://github.com/cloudnative-pg/cloudnative-pg/releases

Next, create a yaml file for your database cluster as `timescaledb.yaml`, using the [timescaledb-postgis image]:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: timescaledb
spec:
  instances: 1
  imageName: ghcr.io/imusmanmalik/timescaledb-postgis:latest
  bootstrap:
    initdb:
      postInitTemplateSQL:
        - CREATE EXTENSION timescaledb;
        - CREATE EXTENSION postgis;
        - CREATE EXTENSION postgis_topology;
        - CREATE EXTENSION fuzzystrmatch;
        - CREATE EXTENSION postgis_tiger_geocoder;
  postgresql:
    shared_preload_libraries:
      - timescaledb
  storage:
    size: 5Gi
    # storageClass: do-block-storage # In my case, I need a custom storage class with DigitalOcean
```

[timescaledb-postgis image]: https://github.com/imusmanmalik/cloudnative-pg-timescaledb-postgis-containers

And finally apply this file to your cluster:

```bash
kubectl apply -f ./timescaledb.yaml
```

And that's it!

## Connecting to the Database

You can find the password for your database with:

```bash
kubectl get secret timescaledb-app -o jsonpath='{.data.password}' | base64 --decode
```

And connecting to it can be done by first port forwarding your database locally:

```bash
kubectl port-forward timescaledb-0 6432:5432
```

*Replace `timescaledb-0` with the pod name of your cluster.*

Finally connect using psql:

```bash
psql -U app -h localhost -p 6432 app
```

Best of luck!
