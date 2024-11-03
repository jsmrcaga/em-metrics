module staging {
  source = "../stack"

  environment = "staging"
  otel_collector_url = "http://alloy.alloy.svc.cluster.local:4381/v1/metrics"


  replicas = 1

  app = {
    port = 3000
  }

  service = {
    port = 3001
  }

  ingress = {
    host = "em.staging.jocolina.com"
  }

  subdomain = {
    name = "em.staging.jocolina.com"
    zone_id = var.subdomain.zone_id
  }

  env = {
    HOST = "0.0.0.0"
    PORT = 3000
  }

  api_token = "staging-token"

  docker = {
    username = var.docker.username
    password = var.docker.password
    registry = "ghcr.io"
  }
}
