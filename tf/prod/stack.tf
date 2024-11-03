module production {
  source = "../stack"

  environment = "production"
  otel_collector_url = "http://alloy.alloy.svc.cluster.local:4381/v1/metrics"


  replicas = 1

  app = {
    port = 3000
  }

  service = {
    port = 3002
  }

  ingress = {
    host = "em.jocolina.com"
  }

  subdomain = {
    name = "em.jocolina.com"
    zone_id = var.subdomain.zone_id
  }

  env = {
    HOST = "0.0.0.0"
    PORT = 3000
  }

  api_token = "staging-token"

  docker = var.docker
}
